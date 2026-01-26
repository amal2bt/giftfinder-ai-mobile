# Android Emulator Network Configuration

## ⚠️ Important: Android Emulator Network Access

Android emulators use a **special IP address** to access the host machine:
- **`10.0.2.2`** = Maps to host's `127.0.0.1` (localhost)
- **`192.168.x.x`** = Won't work from Android emulator (it's in the emulator's network, not your host network)

## ✅ Solution

The code now automatically detects Android and uses the correct IP:
- **Android Emulator**: Uses `http://10.0.2.2:4000` (accesses host's localhost)
- **Physical Android Device**: Uses configured URL (e.g., `http://192.168.0.101:4000`)
- **iOS Simulator**: Uses `http://localhost:4000` or configured URL

## 📱 Testing

### For Android Emulator:
1. Make sure backend is running on `localhost:4000`
2. The app will automatically use `10.0.2.2:4000`
3. No configuration needed!

### For Physical Android Device:
1. Make sure backend is running and accessible on network IP (e.g., `192.168.0.101:4000`)
2. Update `app.json`:
   ```json
   "EXPO_PUBLIC_BACKEND_URL": "http://192.168.0.101:4000"
   ```
3. Restart the app

## 🔍 How It Works

The code checks:
1. If Android platform
2. If configured URL contains "localhost" → use `10.0.2.2:4000` (emulator)
3. If configured URL is network IP → use that (physical device)
4. Otherwise → default to `10.0.2.2:4000` (emulator)

## 🐛 Troubleshooting

### "Network Error" on Android Emulator
- ✅ Make sure backend is running on `localhost:4000`
- ✅ The app should use `10.0.2.2:4000` automatically
- ✅ Check backend logs to see if requests are coming in

### "Network Error" on Physical Device
- ✅ Make sure backend is accessible on network IP
- ✅ Check firewall allows port 4000
- ✅ Verify device and backend are on same network
- ✅ Update `app.json` with correct network IP

