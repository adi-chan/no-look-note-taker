import requests

with open("dummy.mp3", "wb") as f:
    f.write(b"fake mp3 data")

res = requests.post("http://localhost:8000/api/process/audio", 
                    files={"file": ("dummy.mp3", open("dummy.mp3", "rb"), "audio/mpeg")},
                    headers={"x-gemini-api-key": "fake_key"})

print(res.status_code)
print(res.text)
