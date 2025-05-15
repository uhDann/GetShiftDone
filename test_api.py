import requests
import json

# The URL of your Flask app
url = "http://localhost:5001/make-calls"

# Sample data with array of phone numbers and single name/website
data = {
    "numbers": [
        "+447341366667",
        "+447859234405",
        "+447470400566"
    ],
    "name": "Daniil",
    "website": "johndoe.com"
}

# Send the POST request
response = requests.post(url, json=data)

# Print the response
print(f"Status code: {response.status_code}")
print(json.dumps(response.json(), indent=4))

get_url = "http://localhost:5001/get-prompt"

# Comment out the following lines if you don't want to get the current default prompt
# get_response = requests.get(get_url)
# print(f"\nGet prompt status code: {get_response.status_code}")
# print(json.dumps(get_response.json(), indent=4)) 