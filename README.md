# Dev for — Local + Remote image persistence

This project serves a static site and an optional Flask backend that persists uploaded gallery images so they are visible from other devices (e.g., when forwarding the server with ngrok).

Quick start

1. Install dependencies

```powershell
cd "C:\Users\Phiji\Desktop\Dev for"
python -m pip install -r requirements.txt
```

2. Start the server

```powershell
python server.py
```

3. (Optional) Forward port 5000 with ngrok so other devices on the internet can access it:

```powershell
ngrok http 5000
```

ngrok will display a public URL like `https://abcd-1234.ngrok.io` — open that on your phone or laptop.

Notes

- If you accidentally run `python -m http.server 5000` the static server will not handle API requests (`/api/upload` and `/api/state`) and uploads will only be saved locally in the browser (localStorage). Make sure to run `python server.py` instead.
- If devices are on the same LAN, you can also open `http://<your-pc-ip>:5000` on the other device.
- If Windows blocks incoming connections, allow port 5000 through the firewall:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Allow Python 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

How it works

- Client (`script.js`) will detect the server at `/api/state` on page load. If available, uploads from any device are stored under `uploads/` and recorded in `data_state.json`.
- The client polls `/api/state` every 5s to pick up uploads made from other devices and updates the gallery automatically.
- If the server is not running, the client falls back to storing images in `localStorage` (Data URLs) for same-device persistence only.

Troubleshooting

- If uploads appear in one device but not another, confirm you're using the server URL (ngrok or LAN IP) and not a static file server.
- Check the browser console for failed `fetch` calls (CORS or network errors). The Flask app serves files from the same origin so when using the ngrok/LAN URL it should match.
