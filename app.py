from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from supabase import create_client, Client
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Configure upload folder and allowed extensions
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Supabase client
supabase_url = 'https://glwjzrmnlxdbmpjfijpc.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd2p6cm1ubHhkYm1wamZpanBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTQxODQsImV4cCI6MjA1ODY3MDE4NH0.7KCiILJ_-apF4x-djiY8buXBPReor5X7G38Wy1JjRxc'
supabase: Client = create_client(supabase_url, supabase_key)

# After initializing Supabase client
print("Testing Supabase connection...")
test_response = supabase.table('donators').select('*').execute()
print("Test response:", test_response.data)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/home")
def homepage():
    try:
        # Get user data from session
        mobile_number = session.get('mobile_number')
        if not mobile_number:
            return redirect(url_for('sign'))
        
        # Fetch user data from users table
        user_response = supabase.table('users').select('*').eq('mobile_number', mobile_number).execute()
        
        if user_response.data:
            user_data = user_response.data[0]
        else:
            user_data = None
            
        return render_template("homepage.html", user=user_data)
        
    except Exception as e:
        print("Error fetching user data:", str(e))
        return render_template("homepage.html", user=None)

@app.route("/sign")
def sign():
    return render_template("sign.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        mobile_number = request.form.get("email")
        username = request.form.get("username")
        password = request.form.get("password")

        # Insert data into Supabase
        response = supabase.table('users').insert({
            'username': username,
            'mobile_number': mobile_number,
            'password': password
        }).execute()

        if response.error:
            print("Error inserting data:", response.error)
            return jsonify({"error": "There was an error signing up. Please try again."}), 400

        return jsonify({"success": "User signed up successfully!"}), 200

    return render_template("signup.html")

@app.route("/donate", methods=["GET", "POST"])
def donate():
    if request.method == "POST":
        try:
            mobile_number = session.get('mobile_number')
            if not mobile_number:
                return jsonify({"error": "Please login first"}), 401
            
            data = request.get_json()
            
            # Insert the donation record into the 'donators' table
            supabase.table('donators').insert({
                'username': data.get("full_name"),
                'mobile_number': mobile_number,
                'address': data.get("address"),
                'utr': data.get("utr"),
                'amount': float(data.get("amount")),
                'approved': False
            }).execute()

            return jsonify({"success": True}), 200

        except Exception as e:
            print("Error:", str(e))
            return jsonify({"error": "Please login first"}), 401

    return render_template("donate.html")

@app.route("/donaters")
def donaters():
    try:
        # Get donations from donators table
        donations_response = supabase.table('donators').select('*').execute()
        
        # Get data from the manual donors table
        manual_donors_response = supabase.table('manual_donors').select('*').execute()
        
        # Get data from the priest donors table
        priest_donors_response = supabase.table('priest_donors').select('*').execute()
        
        return render_template("donaters.html", 
                             donations=donations_response.data,
                             manual_donors=manual_donors_response.data,
                             priest_donors=priest_donors_response.data)
        
    except Exception as e:
        print("Error:", str(e))
        return render_template("donaters.html", donations=[], manual_donors=[], priest_donors=[])

@app.route("/slokas_and_songs")
def slokas_and_songs():
    return render_template("slokas and songs.html")

@app.route("/signin", methods=["GET", "POST"])
def signin():
    if request.method == "POST":
        mobile_number = request.form.get("mobile_number")
        password = request.form.get("password")

        try:
            # Query Supabase to check if the user exists
            response = supabase.table('users').select('*').eq('mobile_number', mobile_number).execute()
            
            # Check if the response contains data
            if response.data:
                user = response.data[0]
                if user['password'] == password:
                    session['mobile_number'] = mobile_number
                    return jsonify({"success": "User signed in successfully!"}), 200
                else:
                    return jsonify({"error": "Invalid mobile number or password."}), 401
            else:
                return jsonify({"error": "Invalid mobile number or password."}), 401

        except Exception as e:
            print("Error querying Supabase:", e)
            return jsonify({"error": "There was an error signing in. Please try again."}), 400

    return render_template("sign.html")

# Add a new route for admin approval (you'll need to add admin authentication)
@app.route("/admin/approve-donation", methods=["POST"])
def approve_donation():
    try:
        data = request.get_json()
        donation_id = data.get("donation_id")
        
        # Update the donation approval status
        response = supabase.table('donators')\
            .update({'approved': True})\
            .eq('id', donation_id)\
            .execute()
            
        if response.error:
            return jsonify({"error": "Failed to approve donation"}), 400
            
        return jsonify({"success": "Donation approved successfully"}), 200
        
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Server error"}), 500

if __name__ == "__main__":
    app.run(debug=True)
