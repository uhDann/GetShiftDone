from elevenlabs import ElevenLabs
import os
from dotenv import load_dotenv
import time
from flask import Flask, request, jsonify

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Initialize ElevenLabs client
client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

# Get values from environment
agent_id = os.getenv("AGENT_ID")
agent_phone_number_id = os.getenv("AGENT_PHONE_NUMBER_ID")
# Define system prompt directly in the script
system_prompt = "Hi there, your friend {{name}} is slacking off on {{website}} instead of working. Tell me something motivational so I can pass it on to them: "

@app.route('/make-calls', methods=['POST'])
def make_calls():
    # Get data from request
    data = request.get_json()
    
    if not data or 'numbers' not in data:
        return jsonify({'error': 'No phone numbers provided'}), 400
    
    # Get single name and website for all calls
    name = data.get('name', 'there')
    website = data.get('website', 'our website')
    phone_numbers = data['numbers']
    
    results = []
    
    # Make calls to each number
    for phone_number in phone_numbers:
        try:
            # Handle both string and object formats for backward compatibility
            if isinstance(phone_number, dict) and 'phone' in phone_number:
                phone_number = phone_number['phone']
            
            phone_number = phone_number.strip()
            print(f"Calling {phone_number}...")
            
            # Personalize the prompt with the single name and website
            personalized_prompt = system_prompt.replace("{{name}}", name).replace("{{website}}", website)
            
            # For debugging
            print(f"Using prompt: {personalized_prompt}")
            
            # Make the call
            response = client.conversational_ai.twilio_outbound_call(
                agent_id=agent_id,
                agent_phone_number_id=agent_phone_number_id,
                to_number=phone_number,
                conversation_initiation_client_data={
                    "conversation_config_override": {
                        "agent": {
                            "first_message": personalized_prompt
                        }
                    }
                }
            )
            
            # Response handling
            results.append({
                'number': phone_number,
                'status': 'success',
                'call_id': getattr(response, 'call_id', 'unknown')
            })
            # Wait 5 seconds between calls to avoid rate limiting
            time.sleep(5)
        except Exception as e:
            results.append({
                'number': phone_number if isinstance(phone_number, str) else str(phone_number),
                'status': 'failed',
                'error': str(e)
            })
    
    return jsonify({
        'message': 'Calls processed',
        'name': name,
        'website': website,
        'results': results
    })

# Route to test if the API is working
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)