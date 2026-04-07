# 🚀 AskVera – AI-Powered Assistant

🔗 **Live Demo:** https://askvera.onrender.com/
📂 **Repository:** https://github.com/PratimPaik1/AskVera/

---

## 📌 Overview

**AskVera** is a full-stack AI-powered assistant that enables users to chat, ask questions, and receive intelligent responses in real time.

It showcases real-world implementation of:

* AI-powered conversational systems
* Authentication & user management
* Real-time chat interfaces
* Cloud deployment

---

## ✨ Features

* 🤖 AI-powered chat (multi-agent capable)
* 🔐 Secure authentication (login/signup)
* 📧 Email verification system
* 💬 Real-time conversation UI
* 🧠 Context-aware responses
* 🌐 Internet search integration
* ⚡ Fast & responsive UI
* ☁️ Deployed on Render (Free Tier)

---

## 🛠️ Tech Stack

### 🎨 Frontend

* React.js
* Tailwind CSS

### ⚙️ Backend

* Node.js
* Express.js

### 🧠 AI & Integrations

* LangChain
* Google Generative AI
* Mistral AI

### 🔧 Services

* Nodemailer (Email)
* Render (Deployment)

---

## 📂 Project Structure

```
AskVera/
│
├── Backend/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── config/
│   └── server.js
│
├── Frontend/
│   ├── src/
│   ├── components/
│   └── pages/
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/PratimPaik1/AskVera.git
cd AskVera
```

---

### 2️⃣ Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file:

```env
PORT=5000

# Google OAuth / Email Config
GOOGLE_USER=your_email@gmail.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Auth
JWT_SECRET=your_secret
```

Run backend:

```bash
npm run dev
```

---

### 3️⃣ Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

---

## 📧 Email Configuration

Uses **Gmail OAuth2 (Nodemailer)** for sending emails.

> ⚠️ Note:

* Free hosting (Render) may block SMTP ports
* Emails may fail in production without domain verification

### ✅ Recommended Alternatives

* Resend (production-ready)
* Mailtrap (testing)

---

## 🚀 Deployment

Hosted on **Render**:

* Backend → Web Service
* Frontend → Static Site

🔗 **Live App:** https://askvera.onrender.com/

---

## ⚠️ Known Issues

* ⏳ Cold start delays (free hosting)
* 📧 SMTP/email failures on free tier
* 🌐 Domain required for production email services

---

## 📈 Future Improvements

* 🔄 Typing animation via WebSockets
* 🧠 Improved chat memory
* 👥 Multi-user chat support
* 🎤 Voice AI integration
* 📱 Better mobile responsiveness

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Open a pull request

---

## 📜 License

Licensed under the **MIT License**

---

## 👨‍💻 Author

**Pratim Paik**
🔗 https://github.com/PratimPaik1

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!
