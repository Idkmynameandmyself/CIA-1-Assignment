from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import os

app = Flask(__name__)

# Serve the frontend files
@app.route('/')
def index(): 
    return send_from_directory('.', 'index.html')

@app.route('/css/<path:path>')
def send_css(path): 
    return send_from_directory('css', path)

@app.route('/js/<path:path>')
def send_js(path): 
    return send_from_directory('js', path)

@app.route('/model.json')
def send_model(): 
    return send_from_directory('.', 'model.json')

# Route to handle CSV uploads
@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    try:
        df = pd.read_csv(file)
        # Convert dataframe to JSON list for the JS frontend to handle
        return jsonify({
            "data": df.to_dict(orient='records'),
            "headers": df.columns.tolist(),
            "shape": df.shape
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)