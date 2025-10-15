import os
import logging
import uuid
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_file
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import stripe
import json
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from itsdangerous import URLSafeTimedSerializer
import secrets
import string
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import io
import math
from config import Config
import requests
from authlib.integrations.flask_client import OAuth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize MySQL
mysql = MySQL(app)

# Initialize Stripe
stripe.api_key = app.config['STRIPE_SECRET_KEY']

# Initialize serializer for password reset
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Initialize OAuth
oauth = OAuth(app)

# Configure Google OAuth
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Configure logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/future_mech.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Future Mech startup')

# Create directories if they don't exist
for directory in ['logs', 'reports', 'static/images', 'static/uploads', 'static/uploads/services', 'static/uploads/car_parts', 'static/uploads/avatars']:
    os.makedirs(directory, exist_ok=True)

# Helper functions
def save_image(file, subfolder):
    """Validate and save image, returns public URL or None"""
    if not file or not getattr(file, 'filename', None):
        return None
    filename = secure_filename(file.filename)
    if not filename:
        return None
    ext = os.path.splitext(filename)[1].lower()
    allowed = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    if ext not in allowed:
        return None
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = os.path.join('static', 'uploads', subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    full_path = os.path.join(upload_dir, unique_name)
    file.save(full_path)
    return f"/static/uploads/{subfolder}/{unique_name}"

def send_email(to, subject, body, attachment=None):
    """Send email with optional attachment"""
    try:
        if app.config.get('MAIL_SERVER') and app.config.get('MAIL_USERNAME'):
            msg = MIMEMultipart()
            msg['From'] = app.config['MAIL_DEFAULT_SENDER']
            msg['To'] = to
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            if attachment and os.path.exists(attachment):
                with open(attachment, 'rb') as f:
                    attach = MIMEApplication(f.read(), _subtype="pdf")
                    attach.add_header('Content-Disposition', 'attachment', filename=os.path.basename(attachment))
                    msg.attach(attach)
            
            server = smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT'])
            server.starttls()
            server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
            server.send_message(msg)
            server.quit()
        return True
    except Exception as e:
        app.logger.error(f'Email sending failed: {str(e)}')
        return False

def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash('Please log in to access this page.', 'warning')
                return redirect(url_for('login', next=request.url))
            
            if session.get('role') not in roles:
                flash('You do not have permission to access this page.', 'danger')
                return redirect(url_for('index'))
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_admin_stats():
    """Get comprehensive statistics for admin dashboard"""
    try:
        cur = mysql.connection.cursor()
        
        # Total users by role
        cur.execute("SELECT role, COUNT(*) as count FROM users WHERE is_active = TRUE GROUP BY role")
        role_counts = {row['role']: row['count'] for row in cur.fetchall()}
        
        # Total bookings by status
        cur.execute("SELECT status, COUNT(*) as count FROM bookings GROUP BY status")
        booking_status = {row['status']: row['count'] for row in cur.fetchall()}
        
        # Total orders by payment status
        cur.execute("SELECT payment_status, COUNT(*) as count FROM orders GROUP BY payment_status")
        order_status = {row['payment_status']: row['count'] for row in cur.fetchall()}
        
        # Revenue statistics
        cur.execute("SELECT COALESCE(SUM(total_price), 0) as total_revenue FROM orders WHERE payment_status = 'paid'")
        total_revenue = float(cur.fetchone()['total_revenue'])
        
        cur.execute("""
            SELECT COALESCE(SUM(total_price), 0) as monthly_revenue 
            FROM orders 
            WHERE payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
        monthly_revenue = float(cur.fetchone()['monthly_revenue'])
        
        # Recent bookings (last 5)
        cur.execute("""
            SELECT b.*, u.username as customer_name, s.name as service_name 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            ORDER BY b.created_at DESC 
            LIMIT 5
        """)
        recent_bookings = cur.fetchall()
        
        # Recent orders (last 5)
        cur.execute("""
            SELECT o.*, u.username as customer_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC 
            LIMIT 5
        """)
        recent_orders = cur.fetchall()
        
        # Service person stats
        cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'service' AND is_active = TRUE")
        service_person_count = cur.fetchone()['count']
        
        cur.close()
        
        return {
            'total_users': role_counts.get('client', 0),
            'total_service_persons': service_person_count,
            'total_admins': role_counts.get('admin', 0),
            'total_bookings': sum(booking_status.values()),
            'pending_bookings': booking_status.get('pending', 0),
            'completed_bookings': booking_status.get('completed', 0),
            'total_orders': sum(order_status.values()),
            'pending_orders': order_status.get('pending', 0),
            'paid_orders': order_status.get('paid', 0),
            'total_revenue': total_revenue,
            'monthly_revenue': monthly_revenue,
            'recent_bookings': recent_bookings,
            'recent_orders': recent_orders
        }
    except Exception as e:
        app.logger.error(f'Error getting admin stats: {str(e)}')
        return {
            'total_users': 0,
            'total_service_persons': 0,
            'total_admins': 0,
            'total_bookings': 0,
            'pending_bookings': 0,
            'completed_bookings': 0,
            'total_orders': 0,
            'pending_orders': 0,
            'paid_orders': 0,
            'total_revenue': 0,
            'monthly_revenue': 0,
            'recent_bookings': [],
            'recent_orders': []
        }

def generate_pdi_report(booking_id):
    """Generate PDF report for PDI service"""
    try:
        cur = mysql.connection.cursor()
        
        # Get booking details
        cur.execute("""
            SELECT b.*, u.username, u.email, u.phone, s.name as service_name, s.price, s.description
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            WHERE b.id = %s
        """, (booking_id,))
        booking = cur.fetchone()
        
        if not booking:
            return None
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        story.append(Paragraph("FUTURE MECH - SERVICE REPORT", title_style))
        story.append(Spacer(1, 20))
        
        # Customer Information
        customer_data = [
            ['Customer Information', ''],
            ['Name:', booking['username']],
            ['Email:', booking['email']],
            ['Phone:', booking['phone'] or 'N/A'],
            ['Service Date:', booking['scheduled_date'].strftime('%B %d, %Y') if booking['scheduled_date'] else 'N/A'],
            ['Report ID:', f'FM-{booking_id:06d}']
        ]
        
        customer_table = Table(customer_data, colWidths=[2*inch, 4*inch])
        customer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(customer_table)
        story.append(Spacer(1, 20))
        
        # Service Details
        service_data = [
            ['Service Details', ''],
            ['Service:', booking['service_name']],
            ['Description:', booking['description']],
            ['Price:', f"${booking['price']}"],
            ['Status:', booking['status'].replace('_', ' ').title()],
            ['Notes:', booking['notes'] or 'No additional notes']
        ]
        
        service_table = Table(service_data, colWidths=[2*inch, 4*inch])
        service_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(service_table)
        story.append(Spacer(1, 20))
        
        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER
        )
        
        story.append(Spacer(1, 30))
        story.append(Paragraph("Thank you for choosing Future Mech!", footer_style))
        story.append(Paragraph("Drive the Future with Precision and Power", footer_style))
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", footer_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Save to file
        filename = f"reports/PDI_Report_{booking_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        with open(filename, 'wb') as f:
            f.write(buffer.getvalue())
        
        return filename
    except Exception as e:
        app.logger.error(f'Error generating PDI report: {str(e)}')
        return None
    finally:
        cur.close()

# =============================================================================
# ROUTES - PUBLIC PAGES
# =============================================================================

@app.route('/')
def index():
    """Home page"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM services WHERE is_active = TRUE LIMIT 6")
        services = cur.fetchall()
        cur.close()
        return render_template('home.html', services=services)
    except Exception as e:
        app.logger.error(f'Error loading home page: {str(e)}')
        return render_template('home.html', services=[])

@app.route('/services')
def services():
    """Services page"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM services WHERE is_active = TRUE")
        services = cur.fetchall()
        cur.close()
        return render_template('services.html', services=services)
    except Exception as e:
        app.logger.error(f'Error loading services: {str(e)}')
        flash('Error loading services. Please try again.', 'danger')
        return render_template('services.html', services=[])

@app.route('/car_parts')
def car_parts():
    """Car parts catalog"""
    try:
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        
        cur = mysql.connection.cursor()
        query = "SELECT * FROM car_parts WHERE is_active = TRUE"
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
        
        if search:
            query += " AND (name LIKE %s OR description LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        cur.execute(query, params)
        parts = cur.fetchall()
        
        # Get categories for filter
        cur.execute("SELECT DISTINCT category FROM car_parts WHERE is_active = TRUE AND category IS NOT NULL")
        categories = [cat['category'] for cat in cur.fetchall()]
        
        cur.close()
        return render_template('car_parts.html', parts=parts, categories=categories, 
                             selected_category=category, search_term=search)
    except Exception as e:
        app.logger.error(f'Error loading car parts: {str(e)}')
        flash('Error loading car parts. Please try again.', 'danger')
        return render_template('car_parts.html', parts=[], categories=[])

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    """Contact page"""
    if request.method == 'POST':
        try:
            name = request.form['name']
            email = request.form['email']
            message = request.form['message']
            
            if not name or not email or not message:
                flash('Please fill in all fields.', 'danger')
                return render_template('contact.html')
            
            cur = mysql.connection.cursor()
            cur.execute("INSERT INTO contact_submissions (name, email, message) VALUES (%s, %s, %s)", 
                       (name, email, message))
            mysql.connection.commit()
            cur.close()
            
            # Send email notification
            email_body = f"""
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Message:</strong></p>
            <p>{message}</p>
            """
            send_email(app.config['MAIL_USERNAME'], 'New Contact Form Submission - Future Mech', email_body)
            
            flash('Your message has been sent successfully! We will get back to you soon.', 'success')
            return redirect(url_for('contact'))
        except Exception as e:
            app.logger.error(f'Error sending contact message: {str(e)}')
            flash('An error occurred while sending your message. Please try again.', 'danger')
    
    return render_template('contact.html')

# =============================================================================
# ROUTES - AUTHENTICATION
# =============================================================================

@app.route('/google_login')
def google_login():
    """Initiate Google OAuth login"""
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/google_callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Get authorization response from Google
        token = google.authorize_access_token()
        
        # Verify and decode the ID token
        id_info = id_token.verify_oauth2_token(
            token['id_token'],
            google_requests.Request(),
            app.config['GOOGLE_CLIENT_ID']
        )
        
        # Extract user information
        google_id = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', '')
        picture = id_info.get('picture', '')
        
        # Check if user exists in database
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if user:
            # User exists, log them in
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['email'] = user['email']
            session['role'] = user['role']
            session['google_id'] = google_id
            
            # Update last login
            cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user['id'],))
            mysql.connection.commit()
            
            flash(f'Welcome back, {user["username"]}!', 'success')
            
        else:
            # Create new user with Google authentication
            username = email.split('@')[0]
            
            # Generate unique username if needed
            counter = 1
            original_username = username
            while True:
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if not cur.fetchone():
                    break
                username = f"{original_username}{counter}"
                counter += 1
            
            # Insert new user
            cur.execute("""
                INSERT INTO users (username, email, password, role, is_active, email_verified, profile_image) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (username, email, 'google_oauth', 'client', True, True, picture))
            mysql.connection.commit()
            
            new_user_id = cur.lastrowid
            
            # Set session
            session['user_id'] = new_user_id
            session['username'] = username
            session['email'] = email
            session['role'] = 'client'
            session['google_id'] = google_id
            
            flash(f'Welcome to Future Mech, {username}!', 'success')
        
        cur.close()
        
        # Redirect based on role
        if session.get('role') == 'admin':
            return redirect(url_for('admin_dashboard'))
        elif session.get('role') == 'service':
            return redirect(url_for('service_dashboard'))
        else:
            return redirect(url_for('client_dashboard'))
            
    except Exception as e:
        app.logger.error(f'Google OAuth error: {str(e)}')
        flash('Authentication failed. Please try again or use email/password.', 'error')
        return redirect(url_for('login'))

@app.route('/facebook_login')
def facebook_login():
    flash('Facebook login is not yet implemented. Please use Google login or email/password.', 'info')
    return redirect(url_for('login'))

# Admin Reports Route (Fix the BuildError)
@app.route('/admin/reports')
@login_required
@role_required(['admin'])
def admin_reports():
    try:
        cur = mysql.connection.cursor()
        
        # Get report statistics
        cur.execute("""
            SELECT report_type, COUNT(*) as count, 
                   DATE(created_at) as date, 
                   COUNT(CASE WHEN status = 'generated' THEN 1 END) as generated,
                   COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                   COUNT(CASE WHEN status = 'downloaded' THEN 1 END) as downloaded
            FROM reports 
            GROUP BY report_type, DATE(created_at)
            ORDER BY date DESC
        """)
        report_stats = cur.fetchall()
        
        cur.close()
        
        return render_template('admin_reports.html', 
                             report_stats=report_stats,
                             title='Admin Reports')
        
    except Exception as e:
        flash(f'Error loading reports: {str(e)}', 'error')
        return redirect(url_for('admin_dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        try:
            email = request.form.get('email', '').strip().lower()
            password = request.form.get('password', '')
            
            if not email or not password:
                flash('Please enter both email and password.', 'danger')
                return render_template('login.html')
            
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE email = %s AND is_active = TRUE", (email,))
            user = cur.fetchone()
            
            if user and check_password_hash(user['password'], password):
                # Update last login
                cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user['id'],))
                mysql.connection.commit()
                
                # Set session
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['role'] = user['role']
                session['email'] = user['email']
                session.permanent = True
                
                flash(f'Welcome back, {user["username"]}!', 'success')
                
                # Redirect based on role
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                
                if user['role'] == 'admin':
                    return redirect(url_for('admin_dashboard'))
                elif user['role'] == 'service':
                    return redirect(url_for('service_dashboard'))
                else:
                    return redirect(url_for('client_dashboard'))
            else:
                flash('Invalid email or password. Please try again.', 'danger')
            
            cur.close()
        except Exception as e:
            app.logger.error(f'Login error: {str(e)}')
            flash('An error occurred during login. Please try again.', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        try:
            username = request.form['username']
            email = request.form['email']
            password = request.form['password']
            confirm_password = request.form['confirm_password']
            phone = request.form.get('phone', '')
            
            # Validation
            if not username or not email or not password:
                flash('Please fill in all required fields.', 'danger')
                return render_template('register.html')
            
            if password != confirm_password:
                flash('Passwords do not match.', 'danger')
                return render_template('register.html')
            
            if len(password) < 6:
                flash('Password must be at least 6 characters long.', 'danger')
                return render_template('register.html')
            
            hashed_password = generate_password_hash(password)
            
            cur = mysql.connection.cursor()
            cur.execute("INSERT INTO users (username, email, password, phone) VALUES (%s, %s, %s, %s)", 
                       (username, email, hashed_password, phone))
            mysql.connection.commit()
            cur.close()
            
            # Send welcome email
            email_body = f"""
            <h2>Welcome to Future Mech!</h2>
            <p>Dear {username},</p>
            <p>Thank you for registering with Future Mech. We're excited to have you on board!</p>
            <p>You can now book services, purchase car parts, and manage your vehicle maintenance.</p>
            <br>
            <p>Best regards,<br>The Future Mech Team</p>
            """
            send_email(email, 'Welcome to Future Mech!', email_body)
            
            flash('Registration successful! You can now log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('Username or email already exists. Please try again.', 'danger')
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('index'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Password reset request"""
    if request.method == 'POST':
        try:
            email = request.form['email']
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            cur.close()
            
            if user:
                # Generate reset token (simplified for demo)
                token = secrets.token_urlsafe(32)
                # In production, store token in database with expiry
                
                reset_url = url_for('reset_password', token=token, _external=True)
                email_body = f"""
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_url}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                """
                send_email(email, 'Password Reset - Future Mech', email_body)
                
                flash('Password reset link sent to your email.', 'success')
            else:
                flash('Email not found.', 'danger')
        except Exception as e:
            app.logger.error(f'Password reset error: {str(e)}')
            flash('An error occurred. Please try again.', 'danger')
    
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Password reset form"""
    if request.method == 'POST':
        try:
            password = request.form['password']
            confirm_password = request.form['confirm_password']
            
            if password != confirm_password:
                flash('Passwords do not match.', 'danger')
                return render_template('reset_password.html', token=token)
            
            # In production, verify token from database
            flash('Password reset successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('An error occurred. Please try again.', 'danger')
    
    return render_template('reset_password.html', token=token)

# =============================================================================
# ROUTES - DASHBOARDS
# =============================================================================

@app.route('/dashboard')
@login_required
def client_dashboard():
    """Client dashboard"""
    if session.get('role') == 'admin':
        return redirect(url_for('admin_dashboard'))
    elif session.get('role') == 'service':
        return redirect(url_for('service_dashboard'))
    
    try:
        cur = mysql.connection.cursor()
        
        # Get user bookings
        cur.execute("""
            SELECT b.*, s.name as service_name, s.price 
            FROM bookings b 
            JOIN services s ON b.service_id = s.id 
            WHERE b.user_id = %s 
            ORDER BY b.created_at DESC
            LIMIT 10
        """, (session['user_id'],))
        bookings = cur.fetchall()
        
        # Get user orders
        cur.execute("""
            SELECT o.*, 
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
            FROM orders o 
            WHERE o.user_id = %s 
            ORDER BY o.created_at DESC
            LIMIT 10
        """, (session['user_id'],))
        orders = cur.fetchall()
        
        cur.close()
        return render_template('dashboard_client.html', bookings=bookings, orders=orders)
    except Exception as e:
        app.logger.error(f'Client dashboard error: {str(e)}')
        flash('Error loading dashboard.', 'danger')
        return render_template('dashboard_client.html', bookings=[], orders=[])

@app.route('/dashboard/service')
@login_required
@role_required(['service'])
def service_dashboard():
    """Service person dashboard"""
    try:
        cur = mysql.connection.cursor()
        
        # Get assigned bookings
        cur.execute("""
            SELECT b.*, u.username as client_name, s.name as service_name, s.price 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            WHERE b.assigned_to = %s 
            ORDER BY 
                CASE b.status
                    WHEN 'in_progress' THEN 1
                    WHEN 'confirmed' THEN 2
                    WHEN 'pending' THEN 3
                    ELSE 4
                END,
                b.scheduled_date ASC
        """, (session['user_id'],))
        bookings = cur.fetchall()
        
        # Get today's stats
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE assigned_to = %s 
            AND DATE(scheduled_date) = CURDATE()
        """, (session['user_id'],))
        today_bookings = cur.fetchone()['count']
        
        cur.close()
        return render_template('dashboard_service.html', bookings=bookings, today_bookings=today_bookings)
    except Exception as e:
        app.logger.error(f'Service dashboard error: {str(e)}')
        flash('Error loading service dashboard.', 'danger')
        return render_template('dashboard_service.html', bookings=[], today_bookings=0)

@app.route('/dashboard/admin')
@login_required
@role_required(['admin'])
def admin_dashboard():
    """Admin dashboard"""
    if 'user_id' not in session or session.get('role') != 'admin':
        flash('Please login as admin to access dashboard', 'error')
        return redirect(url_for('login'))
    
    try:
        cur = mysql.connection.cursor()
        
        # Get total users count
        cur.execute("SELECT COUNT(*) as count FROM users")
        total_users = cur.fetchone()['count']
        
        # Get client count
        cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'client'")
        client_count = cur.fetchone()['count']
        
        # Get service count
        cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'service'")
        service_count = cur.fetchone()['count']
        
        # Get total bookings count
        cur.execute("SELECT COUNT(*) as count FROM bookings")
        total_bookings = cur.fetchone()['count']
        
        # Get total orders count
        cur.execute("SELECT COUNT(*) as count FROM orders")
        total_orders = cur.fetchone()['count']
        
        # Get total revenue (all time)
        cur.execute("SELECT COALESCE(SUM(total_price), 0) as revenue FROM orders")
        total_revenue = cur.fetchone()['revenue']
        
        # Get monthly revenue
        cur.execute("""
            SELECT COALESCE(SUM(total_price), 0) as revenue 
            FROM orders 
            WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        """)
        monthly_revenue = cur.fetchone()['revenue']
        
        # Get recent bookings
        cur.execute("""
            SELECT b.*, u.username as customer_name, s.name as service_name 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            ORDER BY b.created_at DESC LIMIT 5
        """)
        recent_bookings = cur.fetchall()
        
        # Get recent orders
        cur.execute("""
            SELECT o.*, u.username as customer_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC LIMIT 5
        """)
        recent_orders = cur.fetchall()
        
        # Create stats object for the template (FIXED)
        stats = {
            'total_users': total_users,
            'total_bookings': total_bookings,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'clients': client_count,
            'services': service_count,
            'revenue': monthly_revenue,
            'bookings_today': 0,  # You can add this query
            'pending_orders': 0   # You can add this query
        }
        
        cur.close()
        
        return render_template('dashboard_admin.html',
                             client_count=client_count,
                             service_count=service_count,
                             monthly_revenue=monthly_revenue,
                             recent_bookings=recent_bookings,
                             recent_orders=recent_orders,
                             stats=stats,
                             title='Admin Dashboard')
        
    except Exception as e:
        flash(f'Error loading dashboard: {str(e)}', 'error')
        
        # Create empty stats object even in error case
        stats = {
            'total_users': 0,
            'total_bookings': 0,
            'total_orders': 0,
            'total_revenue': 0,
            'clients': 0,
            'services': 0,
            'revenue': 0,
            'bookings_today': 0,
            'pending_orders': 0
        }
        
        return render_template('dashboard_admin.html',
                             client_count=0,
                             service_count=0,
                             monthly_revenue=0,
                             recent_bookings=[],
                             recent_orders=[],
                             stats=stats,
                             title='Admin Dashboard')

# =============================================================================
# ROUTES - BOOKINGS & SERVICES
# =============================================================================

@app.route('/book_service/<int:service_id>', methods=['POST'])
@login_required
@role_required(['client'])
def book_service(service_id):
    """Book a service with vehicle selection - FIXED"""
    try:
        data = request.get_json()
        vehicle_id = data.get('vehicle_id')
        scheduled_date = data.get('scheduled_date')
        notes = data.get('notes', '')
        
        # Validate required fields
        if not vehicle_id or not scheduled_date:
            return jsonify({'success': False, 'message': 'Vehicle and date are required'}), 400
        
        # Check if vehicle belongs to user
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM vehicles WHERE id = %s AND user_id = %s", (vehicle_id, session['user_id']))
        vehicle = cur.fetchone()
        
        if not vehicle:
            cur.close()
            return jsonify({'success': False, 'message': 'Invalid vehicle selected'}), 400
        
        # Get service details
        cur.execute("SELECT * FROM services WHERE id = %s AND is_active = TRUE", (service_id,))
        service = cur.fetchone()
        
        if not service:
            cur.close()
            return jsonify({'success': False, 'message': 'Service not found'}), 404
        
        # Create booking
        cur.execute("""
            INSERT INTO bookings (user_id, service_id, vehicle_id, scheduled_date, notes, total_amount) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (session['user_id'], service_id, vehicle_id, scheduled_date, notes, service['price']))
        mysql.connection.commit()
        booking_id = cur.lastrowid
        
        # Create payment record
        cur.execute("""
            INSERT INTO payments (booking_id, amount, payment_method, status) 
            VALUES (%s, %s, %s, %s)
        """, (booking_id, service['price'], 'pending', 'pending'))
        mysql.connection.commit()
        cur.close()
        
        # Send confirmation email
        try:
            email_body = f"""
            <h2>Booking Confirmation</h2>
            <p>Your booking for {service['name']} has been received.</p>
            <p><strong>Vehicle:</strong> {vehicle['make']} {vehicle['model']} ({vehicle['registration_no']})</p>
            <p><strong>Scheduled:</strong> {scheduled_date}</p>
            <p><strong>Amount:</strong> ${service['price']}</p>
            <p><strong>Notes:</strong> {notes or 'None'}</p>
            """
            send_email(session['email'], 'Booking Confirmation - Future Mech', email_body)
        except Exception as email_error:
            app.logger.error(f'Booking confirmation email error: {str(email_error)}')
        
        return jsonify({
            'success': True, 
            'message': 'Booking created successfully', 
            'booking_id': booking_id
        })
    except Exception as e:
        app.logger.error(f'Booking error: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

# =============================================================================
# ROUTES - SHOPPING CART & ORDERS
# =============================================================================

@app.route('/add_to_cart/<int:part_id>', methods=['POST'])
@login_required
@role_required(['client'])
def add_to_cart(part_id):
    """Add item to shopping cart"""
    try:
        quantity = int(request.form.get('quantity', 1))
        
        if quantity < 1:
            flash('Invalid quantity.', 'danger')
            return redirect(url_for('car_parts'))
        
        # Check stock
        cur = mysql.connection.cursor()
        cur.execute("SELECT stock FROM car_parts WHERE id = %s AND is_active = TRUE", (part_id,))
        part = cur.fetchone()
        cur.close()
        
        if not part or part['stock'] < quantity:
            flash('Insufficient stock.', 'danger')
            return redirect(url_for('car_parts'))
        
        # Initialize cart
        if 'cart' not in session:
            session['cart'] = {}
        
        cart = session['cart']
        current_qty = cart.get(str(part_id), 0)
        
        if part['stock'] < current_qty + quantity:
            flash('Cannot add more than available stock.', 'danger')
            return redirect(url_for('car_parts'))
        
        cart[str(part_id)] = current_qty + quantity
        session['cart'] = cart
        session.modified = True
        
        flash('Item added to cart!', 'success')
        return redirect(url_for('car_parts'))
    except Exception as e:
        app.logger.error(f'Add to cart error: {str(e)}')
        flash('Error adding item to cart.', 'danger')
        return redirect(url_for('car_parts'))

@app.route('/cart')
@login_required
@role_required(['client'])
def view_cart():
    """View shopping cart"""
    try:
        cart = session.get('cart', {})
        cart_items = []
        total = 0
        
        if cart:
            cur = mysql.connection.cursor()
            part_ids = list(cart.keys())
            format_strings = ','.join(['%s'] * len(part_ids))
            
            cur.execute(f"SELECT * FROM car_parts WHERE id IN ({format_strings}) AND is_active = TRUE", part_ids)
            parts = cur.fetchall()
            
            for part in parts:
                quantity = cart[str(part['id'])]
                if quantity > 0:  # Only add if quantity is positive
                    item_total = float(part['price']) * quantity
                    cart_items.append({
                        'id': part['id'],
                        'name': part['name'],
                        'price': float(part['price']),
                        'quantity': quantity,
                        'total': item_total,
                        'stock': part['stock'],
                        'image': part.get('image_url', '')
                    })
                    total += item_total
            
            cur.close()
        
        return render_template('cart.html', cart_items=cart_items, total=total)
    except Exception as e:
        app.logger.error(f'View cart error: {str(e)}')
        flash('Error loading cart.', 'danger')
        return render_template('cart.html', cart_items=[], total=0)

@app.route('/update_cart/<int:part_id>', methods=['POST'])
@login_required
@role_required(['client'])
def update_cart(part_id):
    """Update cart item quantity"""
    try:
        quantity = int(request.form.get('quantity', 0))
        
        if 'cart' not in session:
            session['cart'] = {}
        
        cart = session['cart']
        
        if quantity <= 0:
            if str(part_id) in cart:
                del cart[str(part_id)]
        else:
            # Check stock
            cur = mysql.connection.cursor()
            cur.execute("SELECT stock FROM car_parts WHERE id = %s", (part_id,))
            part = cur.fetchone()
            cur.close()
            
            if part and quantity <= part['stock']:
                cart[str(part_id)] = quantity
            else:
                flash('Not enough stock available.', 'danger')
                return redirect(url_for('view_cart'))
        
        session['cart'] = cart
        session.modified = True
        flash('Cart updated successfully!', 'success')
        return redirect(url_for('view_cart'))
    except Exception as e:
        app.logger.error(f'Update cart error: {str(e)}')
        flash('Error updating cart.', 'danger')
        return redirect(url_for('view_cart'))

@app.route('/checkout', methods=['POST'])
@login_required
@role_required(['client'])
def checkout():
    """Process checkout"""
    try:
        discount_code = request.form.get('discount_code', '').strip()
        payment_method = request.form.get('payment_method', 'card')
        
        cart = session.get('cart', {})
        if not cart:
            flash('Your cart is empty.', 'warning')
            return redirect(url_for('car_parts'))
        
        cur = mysql.connection.cursor()
        
        # Calculate total and validate items
        total = 0
        valid_items = []
        
        for part_id_str, quantity in cart.items():
            if quantity > 0:
                part_id = int(part_id_str)
                cur.execute("SELECT * FROM car_parts WHERE id = %s AND is_active = TRUE", (part_id,))
                part = cur.fetchone()
                
                if part and part['stock'] >= quantity:
                    item_total = float(part['price']) * quantity
                    total += item_total
                    valid_items.append((part, quantity))
                else:
                    flash(f'Item {part["name"]} is no longer available in the requested quantity.', 'danger')
                    return redirect(url_for('view_cart'))
        
        if not valid_items:
            flash('No valid items in cart.', 'danger')
            return redirect(url_for('view_cart'))
        
        # Apply discount if valid
        discount_amount = 0
        if discount_code:
            cur.execute("""
                SELECT * FROM discounts 
                WHERE code = %s AND is_active = TRUE 
                AND (expiry_date IS NULL OR expiry_date >= CURDATE())
                AND (usage_limit IS NULL OR used_count < usage_limit)
            """, (discount_code,))
            discount = cur.fetchone()
            
            if discount:
                if discount['discount_type'] == 'percentage':
                    discount_amount = total * (discount['value'] / 100)
                else:
                    discount_amount = min(discount['value'], total)
                
                total -= discount_amount
                cur.execute("UPDATE discounts SET used_count = used_count + 1 WHERE id = %s", (discount['id'],))
            else:
                flash('Invalid discount code.', 'danger')
                return redirect(url_for('view_cart'))
        
        # Create order
        cur.execute("INSERT INTO orders (user_id, total_price, discount_amount) VALUES (%s, %s, %s)", 
                   (session['user_id'], total, discount_amount))
        order_id = cur.lastrowid
        
        # Add order items and update stock
        for part, quantity in valid_items:
            cur.execute("""
                INSERT INTO order_items (order_id, part_id, quantity, price) 
                VALUES (%s, %s, %s, %s)
            """, (order_id, part['id'], quantity, part['price']))
            cur.execute("UPDATE car_parts SET stock = stock - %s WHERE id = %s", (quantity, part['id']))
        
        # Create payment record
        cur.execute("""
            INSERT INTO payments (order_id, amount, payment_method, status) 
            VALUES (%s, %s, %s, %s)
        """, (order_id, total, payment_method, 'pending'))
        mysql.connection.commit()
        
        # Clear cart
        session['cart'] = {}
        session.modified = True
        cur.close()
        
        flash('Order placed successfully! Please complete payment.', 'success')
        return redirect(url_for('payment_order', order_id=order_id))
    except Exception as e:
        app.logger.error(f'Checkout error: {str(e)}')
        flash('Error processing order. Please try again.', 'danger')
        return redirect(url_for('view_cart'))

# =============================================================================
# ROUTES - PAYMENTS
# =============================================================================

@app.route('/payment/booking/<int:booking_id>')
@login_required
@role_required(['client'])
def payment_booking(booking_id):
    """Payment page for booking"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT b.*, s.name as service_name, s.price 
            FROM bookings b 
            JOIN services s ON b.service_id = s.id 
            WHERE b.id = %s AND b.user_id = %s
        """, (booking_id, session['user_id']))
        booking = cur.fetchone()
        cur.close()
        
        if not booking:
            flash('Booking not found.', 'danger')
            return redirect(url_for('client_dashboard'))
        
        return render_template('payment.html', 
                              payment_type='booking',
                              id=booking_id,
                              description=booking['service_name'],
                              amount=float(booking['price']))
    except Exception as e:
        app.logger.error(f'Payment booking error: {str(e)}')
        flash('Error loading payment page.', 'danger')
        return redirect(url_for('client_dashboard'))

@app.route('/payment/order/<int:order_id>')
@login_required
@role_required(['client'])
def payment_order(order_id):
    """Payment page for order"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT o.*, 
                   (SELECT GROUP_CONCAT(cp.name) 
                    FROM order_items oi 
                    JOIN car_parts cp ON oi.part_id = cp.id 
                    WHERE oi.order_id = o.id) as items
            FROM orders o 
            WHERE o.id = %s AND o.user_id = %s
        """, (order_id, session['user_id']))
        order = cur.fetchone()
        cur.close()
        
        if not order:
            flash('Order not found.', 'danger')
            return redirect(url_for('client_dashboard'))
        
        return render_template('payment.html', 
                              payment_type='order',
                              id=order_id,
                              description=order['items'],
                              amount=float(order['total_price']))
    except Exception as e:
        app.logger.error(f'Payment order error: {str(e)}')
        flash('Error loading payment page.', 'danger')
        return redirect(url_for('client_dashboard'))

@app.route('/create-payment-intent', methods=['POST'])
@login_required
def create_payment_intent():
    """Create Stripe payment intent"""
    try:
        data = request.json
        amount = int(float(data['amount']) * 100)  # Convert to cents
        
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            metadata={
                'user_id': session['user_id'],
                'type': data.get('type', 'unknown'),
                'id': data.get('id', 0)
            }
        )
        
        return jsonify({
            'clientSecret': intent['client_secret'],
            'amount': amount
        })
    except Exception as e:
        app.logger.error(f'Payment intent error: {str(e)}')
        return jsonify({'error': str(e)}), 400

@app.route('/payment/success')
@login_required
def payment_success():
    """Payment success callback"""
    try:
        payment_intent = request.args.get('payment_intent')
        payment_type = request.args.get('type')
        item_id = request.args.get('id')
        
        if not payment_intent or not payment_type or not item_id:
            flash('Invalid payment confirmation.', 'danger')
            return redirect(url_for('client_dashboard'))
        
        # Verify payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent)
        
        if intent.status == 'succeeded':
            cur = mysql.connection.cursor()
            
            if payment_type == 'booking':
                cur.execute("""
                    UPDATE payments 
                    SET status = 'completed', transaction_id = %s 
                    WHERE booking_id = %s
                """, (payment_intent, item_id))
                cur.execute("UPDATE bookings SET status = 'confirmed' WHERE id = %s", (item_id,))
                
                # Send confirmation
                cur.execute("""
                    SELECT u.email, s.name, b.scheduled_date 
                    FROM bookings b 
                    JOIN users u ON b.user_id = u.id 
                    JOIN services s ON b.service_id = s.id 
                    WHERE b.id = %s
                """, (item_id,))
                booking = cur.fetchone()
                
                if booking:
                    email_body = f"""
                    <h2>Payment Confirmed</h2>
                    <p>Your payment for {booking['name']} has been processed.</p>
                    <p><strong>Scheduled:</strong> {booking['scheduled_date'].strftime('%B %d, %Y at %I:%M %p')}</p>
                    """
                    send_email(booking['email'], 'Payment Confirmed - Future Mech', email_body)
                
            elif payment_type == 'order':
                cur.execute("""
                    UPDATE payments 
                    SET status = 'completed', transaction_id = %s 
                    WHERE order_id = %s
                """, (payment_intent, item_id))
                cur.execute("UPDATE orders SET payment_status = 'paid' WHERE id = %s", (item_id,))
                
                # Send confirmation
                cur.execute("""
                    SELECT u.email, o.id, o.total_price 
                    FROM orders o 
                    JOIN users u ON o.user_id = u.id 
                    WHERE o.id = %s
                """, (item_id,))
                order = cur.fetchone()
                
                if order:
                    email_body = f"""
                    <h2>Order Confirmed</h2>
                    <p>Your order #{order['id']} has been confirmed.</p>
                    <p><strong>Total:</strong> ${order['total_price']}</p>
                    """
                    send_email(order['email'], 'Order Confirmed - Future Mech', email_body)
            
            mysql.connection.commit()
            cur.close()
            flash('Payment successful! Thank you for your purchase.', 'success')
        else:
            flash('Payment failed. Please try again.', 'danger')
        
        return redirect(url_for('client_dashboard'))
    except Exception as e:
        app.logger.error(f'Payment success error: {str(e)}')
        flash('Payment verification failed. Please contact support.', 'danger')
        return redirect(url_for('client_dashboard'))

# =============================================================================
# ROUTES - ADMIN MANAGEMENT
# =============================================================================

@app.route('/admin/users')
@login_required
@role_required(['admin'])
def admin_users():
    """User management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users ORDER BY created_at DESC")
        users = cur.fetchall()
        cur.close()
        return render_template('admin_users.html', users=users)
    except Exception as e:
        app.logger.error(f'Admin users error: {str(e)}')
        flash('Error loading users.', 'danger')
        return render_template('admin_users.html', users=[])

@app.route('/admin/services')
@login_required
@role_required(['admin'])
def admin_services():
    """Service management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM services ORDER BY name")
        services = cur.fetchall()
        cur.close()
        return render_template('admin_services.html', services=services)
    except Exception as e:
        app.logger.error(f'Admin services error: {str(e)}')
        flash('Error loading services.', 'danger')
        return render_template('admin_services.html', services=[])

@app.route('/admin/car_parts')
@login_required
@role_required(['admin'])
def admin_car_parts():
    """Car parts management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM car_parts ORDER BY name")
        parts = cur.fetchall()
        cur.close()
        return render_template('admin_car_parts.html', parts=parts)
    except Exception as e:
        app.logger.error(f'Admin car parts error: {str(e)}')
        flash('Error loading car parts.', 'danger')
        return render_template('admin_car_parts.html', parts=[])

@app.route('/admin/bookings')
@login_required
@role_required(['admin'])
def admin_bookings():
    """Booking management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT b.*, u.username as client_name, s.name as service_name 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            ORDER BY b.created_at DESC
        """)
        bookings = cur.fetchall()
        
        # Get service persons for assignment
        cur.execute("SELECT id, username FROM users WHERE role = 'service' AND is_active = TRUE")
        service_persons = cur.fetchall()
        cur.close()
        
        return render_template('admin_bookings.html', bookings=bookings, service_persons=service_persons)
    except Exception as e:
        app.logger.error(f'Admin bookings error: {str(e)}')
        flash('Error loading bookings.', 'danger')
        return render_template('admin_bookings.html', bookings=[], service_persons=[])

@app.route('/admin/orders')
@login_required
@role_required(['admin'])
def admin_orders():
    """Order management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT o.*, u.username 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        """)
        orders = cur.fetchall()
        cur.close()
        return render_template('admin_orders.html', orders=orders)
    except Exception as e:
        app.logger.error(f'Admin orders error: {str(e)}')
        flash('Error loading orders.', 'danger')
        return render_template('admin_orders.html', orders=[])

@app.route('/admin/discounts')
@login_required
@role_required(['admin'])
def admin_discounts():
    """Discount management"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM discounts ORDER BY created_at DESC")
        discounts = cur.fetchall()
        cur.close()
        return render_template('admin_discounts.html', discounts=discounts)
    except Exception as e:
        app.logger.error(f'Admin discounts error: {str(e)}')
        flash('Error loading discounts.', 'danger')
        return render_template('admin_discounts.html', discounts=[])

# =============================================================================
# API ENDPOINTS - FIXED BOOLEAN HANDLING
# =============================================================================

def create_notification(role, message, notification_type, related_id=None):
    """Create a notification for users with specific role"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO notifications (role, message, type, related_id, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (role, message, notification_type, related_id))
        mysql.connection.commit()
        cur.close()
        return True
    except Exception as e:
        app.logger.error(f'Create notification error: {str(e)}')
        return False

def get_notification_title(notification_type):
    """Get notification title based on type"""
    titles = {
        'booking': 'New Booking',
        'contact': 'New Contact Message',
        'order': 'New Order',
        'inventory': 'Inventory Update',
        'system': 'System Notification'
    }
    return titles.get(notification_type, 'Notification')

@app.route('/api/check_notifications')
@login_required
def api_check_notifications():
    """Check for new notifications"""
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT * FROM notifications 
            WHERE (role = %s OR role = 'all') 
            AND id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = %s)
            ORDER BY created_at DESC LIMIT 10
        """, (session.get('role'), session.get('user_id')))
        notifications = cur.fetchall()
        cur.close()
        
        return jsonify({
            'success': True,
            'notifications': [{
                'id': n['id'],
                'message': n['message'],
                'type': n['type'],
                'time': n['created_at'].strftime('%Y-%m-%d %H:%M'),
                'title': get_notification_title(n['type'])
            } for n in notifications]
        })
    except Exception as e:
        app.logger.error(f'Check notifications error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mark_notification_read', methods=['POST'])
@login_required
def api_mark_notification_read():
    """Mark notification as read"""
    try:
        data = request.get_json()
        notification_id = data.get('notification_id')
        
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO notification_reads (user_id, notification_id, read_at)
            VALUES (%s, %s, NOW())
        """, (session.get('user_id'), notification_id))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Mark notification read error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/client/vehicles', methods=['GET'])
@login_required
def get_client_vehicles():
    """Get all vehicles for the logged-in client"""
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT * FROM vehicles WHERE user_id = %s ORDER BY created_at DESC",
            (session['user_id'],)
        )
        vehicles = cur.fetchall()
        
        vehicles_list = []
        for vehicle in vehicles:
            vehicles_list.append({
                'id': vehicle['id'],
                'registration_no': vehicle['registration_no'],
                'make': vehicle['make'],
                'model': vehicle['model'],
                'year': vehicle['year'],
                'color': vehicle.get('color', ''),
                'created_at': vehicle['created_at']
            })
            
        cur.close()
        return jsonify({'success': True, 'vehicles': vehicles_list})
        
    except Exception as e:
        app.logger.error(f'Get client vehicles error: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/client/add_vehicle', methods=['POST'])
@login_required
@role_required(['client'])
def api_add_vehicle():
    """API endpoint to add a vehicle for a client - FIXED"""
    try:
        # Get data from form or JSON
        if request.is_json:
            data = request.get_json()
            registration_no = data.get('registration_no')
            make = data.get('make')
            model = data.get('model')
            year = data.get('year')
            color = data.get('color', '')
        else:
            registration_no = request.form.get('registration_no')
            make = request.form.get('make')
            model = request.form.get('model')
            year = request.form.get('year')
            color = request.form.get('color', '')
        
        # Validation
        if not all([registration_no, make, model, year]):
            return jsonify({'success': False, 'message': 'Registration number, make, model, and year are required'}), 400
        
        # Validate year
        try:
            year = int(year)
            current_year = datetime.now().year
            if year < 1900 or year > current_year + 1:
                return jsonify({'success': False, 'message': 'Please enter a valid year'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Please enter a valid year'}), 400
        
        cur = mysql.connection.cursor()
        
        # Check if vehicle already exists for this user
        cur.execute("""
            SELECT id FROM vehicles 
            WHERE user_id = %s AND registration_no = %s
        """, (session['user_id'], registration_no))
        existing_vehicle = cur.fetchone()
        
        if existing_vehicle:
            cur.close()
            return jsonify({'success': False, 'message': 'Vehicle with this registration number already exists'}), 400
        
        # Insert new vehicle
        cur.execute("""
            INSERT INTO vehicles (user_id, registration_no, make, model, year, color)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (session['user_id'], registration_no, make, model, year, color))
        mysql.connection.commit()
        vehicle_id = cur.lastrowid
        cur.close()
        
        app.logger.info(f'Vehicle added successfully for user {session["user_id"]}: {make} {model} ({registration_no})')
        return jsonify({
            'success': True, 
            'message': 'Vehicle added successfully',
            'vehicle_id': vehicle_id
        })
    except Exception as e:
        app.logger.error(f'API add vehicle error: {str(e)}')
        return jsonify({'success': False, 'message': f'Error adding vehicle: {str(e)}'}), 500


@app.route('/api/update_booking_status', methods=['POST'])
@login_required
@role_required(['admin', 'service'])
def api_update_booking_status():
    """Update booking status"""
    try:
        booking_id = request.json.get('booking_id')
        status = request.json.get('status')
        assigned_to = request.json.get('assigned_to')
        
        cur = mysql.connection.cursor()
        
        if assigned_to:
            cur.execute("UPDATE bookings SET assigned_to = %s WHERE id = %s", (assigned_to, booking_id))
        
        cur.execute("UPDATE bookings SET status = %s WHERE id = %s", (status, booking_id))
        
        if status == 'completed':
            cur.execute("UPDATE bookings SET completed_at = NOW() WHERE id = %s", (booking_id,))
        
        mysql.connection.commit()
        
        # Notify customer
        cur.execute("""
            SELECT u.email, s.name 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            JOIN services s ON b.service_id = s.id 
            WHERE b.id = %s
        """, (booking_id,))
        booking = cur.fetchone()
        
        if booking:
            email_body = f"""
            <h2>Booking Status Update</h2>
            <p>Your booking for {booking['name']} is now: <strong>{status.replace('_', ' ').title()}</strong></p>
            """
            send_email(booking['email'], 'Booking Status Update - Future Mech', email_body)
        
        cur.close()
        return jsonify({'success': True, 'message': 'Status updated successfully'})
    except Exception as e:
        app.logger.error(f'Update booking status error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add_service', methods=['POST'])
@login_required
@role_required(['admin'])
def api_add_service():
    """Add new service - FIXED BOOLEAN HANDLING"""
    try:
        # Support both JSON and multipart/form-data
        if request.is_json:
            data = request.get_json(silent=True) or {}
            image_url = None
        else:
            data = request.form
            image_file = request.files.get('image')
            image_url = save_image(image_file, 'services') if image_file else None

        name = data.get('name')
        description = data.get('description')
        price = data.get('price')
        duration = data.get('duration', 60)
        service_type = data.get('service_type')
        
        # FIXED: Proper boolean conversion for MySQL
        is_active = data.get('is_active') in ['1', 'true', 'True', True, 1, 'on']
        is_featured = data.get('is_featured') in ['1', 'true', 'True', True, 1, 'on']
        
        if not name or price in (None, ''):
            return jsonify({'success': False, 'error': 'Name and price are required'}), 400
        
        # Ensure numeric values are properly formatted
        try:
            price = float(price)
            duration = int(duration)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid price or duration format'}), 400
        
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO services (name, description, price, duration, service_type, is_active, is_featured, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (name, description, price, duration, service_type, is_active, is_featured, image_url))
        mysql.connection.commit()
        service_id = cur.lastrowid
        cur.close()
        
        app.logger.info(f'Service added successfully: {name}, ID: {service_id}')
        return jsonify({'success': True, 'service_id': service_id})
    except Exception as e:
        app.logger.error(f'Add service error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_service', methods=['POST'])
@login_required
@role_required(['admin'])
def api_update_service():
    """Update service - FIXED BOOLEAN HANDLING"""
    try:
        if request.is_json:
            data = request.get_json(silent=True) or {}
            image_url = None
        else:
            data = request.form
            image_file = request.files.get('image')
            image_url = save_image(image_file, 'services') if image_file else None

        service_id = data.get('id')
        name = data.get('name')
        description = data.get('description')
        price = data.get('price')
        duration = data.get('duration')
        service_type = data.get('service_type')
        
        # FIXED: Proper boolean conversion for MySQL
        is_active = data.get('is_active') in ['1', 'true', 'True', True, 1, 'on']
        is_featured = data.get('is_featured') in ['1', 'true', 'True', True, 1, 'on']
        
        # Ensure numeric values are properly formatted
        try:
            price = float(price)
            duration = int(duration)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid price or duration format'}), 400
        
        if image_url:
            cur = mysql.connection.cursor()
            cur.execute("""
                UPDATE services
                SET name = %s, description = %s, price = %s, duration = %s, service_type = %s,
                    is_active = %s, is_featured = %s, image_url = %s
                WHERE id = %s
            """, (name, description, price, duration, service_type, is_active, is_featured, image_url, service_id))
            mysql.connection.commit()
            cur.close()
        else:
            cur = mysql.connection.cursor()
            cur.execute("""
                UPDATE services
                SET name = %s, description = %s, price = %s, duration = %s, service_type = %s,
                    is_active = %s, is_featured = %s
                WHERE id = %s
            """, (name, description, price, duration, service_type, is_active, is_featured, service_id))
            mysql.connection.commit()
            cur.close()
        
        app.logger.info(f'Service updated successfully: {name}, ID: {service_id}')
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Update service error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add_car_part', methods=['POST'])
@login_required
@role_required(['admin'])
def api_add_car_part():
    """Add new car part - FIXED BOOLEAN HANDLING"""
    try:
        if request.is_json:
            data = request.get_json(silent=True) or {}
            image_url = None
        else:
            data = request.form
            image_file = request.files.get('image')
            image_url = save_image(image_file, 'car_parts') if image_file else None

        name = data.get('name')
        description = data.get('description')
        category = data.get('category')
        brand = data.get('brand')
        part_number = data.get('part_number')
        compatibility = data.get('compatibility')
        
        # FIXED: Proper boolean conversion for MySQL
        is_active = data.get('is_active') in ['1', 'true', 'True', True, 1, 'on']
        
        # Ensure numeric values are properly formatted
        try:
            price = float(data.get('price', 0))
            stock = int(data.get('stock', 0))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid price or stock format'}), 400
        
        if not name or price <= 0:
            return jsonify({'success': False, 'error': 'Name and valid price are required'}), 400
        
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO car_parts (name, description, price, stock, category, brand, part_number, compatibility, image_url, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (name, description, price, stock, category, brand, part_number, compatibility, image_url, is_active))
        mysql.connection.commit()
        part_id = cur.lastrowid
        cur.close()
        
        # Create notification for admins
        create_notification('admin', f'New car part added: {name}', 'inventory')
        
        app.logger.info(f'Car part added successfully: {name}, ID: {part_id}')
        return jsonify({'success': True, 'part_id': part_id})
    except Exception as e:
        app.logger.error(f'Add car part error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_car_part', methods=['POST'])
@login_required
@role_required(['admin'])
def api_update_car_part():
    """Update car part - FIXED BOOLEAN HANDLING"""
    try:
        if request.is_json:
            data = request.get_json(silent=True) or {}
            image_url = None
        else:
            data = request.form
            image_file = request.files.get('image')
            image_url = save_image(image_file, 'car_parts') if image_file else None

        part_id = data.get('id')
        name = data.get('name')
        description = data.get('description')
        category = data.get('category')
        brand = data.get('brand')
        part_number = data.get('part_number')
        compatibility = data.get('compatibility')
        
        # FIXED: Proper boolean conversion for MySQL
        is_active = data.get('is_active') in ['1', 'true', 'True', True, 1, 'on']
        
        # Ensure numeric values are properly formatted
        try:
            price = float(data.get('price', 0))
            stock = int(data.get('stock', 0))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid price or stock format'}), 400
        
        if image_url:
            cur = mysql.connection.cursor()
            cur.execute("""
                UPDATE car_parts
                SET name = %s, description = %s, price = %s, stock = %s, category = %s,
                    brand = %s, part_number = %s, compatibility = %s, image_url = %s, is_active = %s
                WHERE id = %s
            """, (name, description, price, stock, category, brand, part_number, compatibility, image_url, is_active, part_id))
            mysql.connection.commit()
            cur.close()
        else:
            cur = mysql.connection.cursor()
            cur.execute("""
                UPDATE car_parts
                SET name = %s, description = %s, price = %s, stock = %s, category = %s,
                    brand = %s, part_number = %s, compatibility = %s, is_active = %s
                WHERE id = %s
            """, (name, description, price, stock, category, brand, part_number, compatibility, is_active, part_id))
            mysql.connection.commit()
            cur.close()
        
        app.logger.info(f'Car part updated successfully: {name}, ID: {part_id}')
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Update car part error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate_report/<int:booking_id>')
@login_required
@role_required(['admin', 'service'])
def api_generate_report(booking_id):
    """Generate PDI report"""
    try:
        report_path = generate_pdi_report(booking_id)
        
        if report_path:
            # Send email with report
            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT u.email, s.name 
                FROM bookings b 
                JOIN users u ON b.user_id = u.id 
                JOIN services s ON b.service_id = s.id 
                WHERE b.id = %s
            """, (booking_id,))
            booking = cur.fetchone()
            cur.close()
            
            if booking:
                email_body = f"""
                <h2>Your Service Report is Ready</h2>
                <p>Your report for {booking['name']} is attached.</p>
                """
                send_email(booking['email'], 'Service Report - Future Mech', email_body, report_path)
            
            return jsonify({'success': True, 'message': 'Report generated and sent'})
        else:
            return jsonify({'success': False, 'error': 'Failed to generate report'}), 500
    except Exception as e:
        app.logger.error(f'Generate report error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete_service/<int:service_id>', methods=['POST'])
@login_required
@role_required(['admin'])
def api_delete_service(service_id):
    """Delete service"""
    try:
        cur = mysql.connection.cursor()
        # Check if service exists
        cur.execute("SELECT * FROM services WHERE id = %s", (service_id,))
        service = cur.fetchone()
        
        if not service:
            cur.close()
            return jsonify({'success': False, 'error': 'Service not found'}), 404
        
        # Delete service
        cur.execute("DELETE FROM services WHERE id = %s", (service_id,))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Delete service error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete_car_part/<int:part_id>', methods=['POST'])
@login_required
@role_required(['admin'])
def api_delete_car_part(part_id):
    """Delete car part"""
    try:
        cur = mysql.connection.cursor()
        # Check if part exists
        cur.execute("SELECT * FROM car_parts WHERE id = %s", (part_id,))
        part = cur.fetchone()
        
        if not part:
            cur.close()
            return jsonify({'success': False, 'error': 'Car part not found'}), 404
        
        # Delete car part
        cur.execute("DELETE FROM car_parts WHERE id = %s", (part_id,))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f'Delete car part error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found_error(error):
    """404 error handler"""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """500 error handler"""
    mysql.connection.rollback()
    app.logger.error(f'Server Error: {str(error)}')
    return render_template('500.html'), 500

@app.errorhandler(403)
def forbidden_error(error):
    """403 error handler"""
    return render_template('403.html'), 403

# =============================================================================
# MAIN APPLICATION
# =============================================================================

if __name__ == '__main__':
    # Create default admin user if not exists
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
        admin_count = cur.fetchone()['count']
        
        if admin_count == 0:
            hashed_password = generate_password_hash('admin123')
            cur.execute("""
                INSERT INTO users (username, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, ('admin', 'admin@futuremech.com', hashed_password, 'admin'))
            mysql.connection.commit()
            app.logger.info('Default admin user created: admin@futuremech.com / admin123')
        
        # Insert default services if none exist
        cur.execute("SELECT COUNT(*) as count FROM services")
        service_count = cur.fetchone()['count']
        
        if service_count == 0:
            default_services = [
                ('Pre-Depth Inspection (PDI)', 'Comprehensive vehicle inspection', 149.99, 120),
                ('Second-Hand Insurance (SCI)', 'Insurance for pre-owned vehicles', 299.99, 60),
                ('Basic Suspension Inspection (BSI)', 'Suspension component check', 89.99, 45),
                ('Detailing Package', 'Complete cleaning and waxing', 199.99, 180),
                ('HPA SOS (Battery & Tow)', 'Emergency services', 79.99, 30)
            ]
            
            for service in default_services:
                cur.execute("INSERT INTO services (name, description, price, duration) VALUES (%s, %s, %s, %s)", service)
            
            mysql.connection.commit()
            app.logger.info('Default services created')
        
        cur.close()
    except Exception as e:
        app.logger.error(f'Initialization error: {str(e)}')
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)