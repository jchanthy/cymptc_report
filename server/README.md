# 🤖 YCPP Facebook Scraper Server

A lightweight, self-hosted Node.js microservice designed to scrape public Facebook post engagement metrics (Likes, Comments, Shares) dynamically. It utilizes **Puppeteer Extra** equipped with the **Stealth Plugin** to bypass automated traffic protection and CAPTCHAs, parsing DOM structure via stable accessibility markers.

---

## ⚡ Quick Start

Follow these simple steps to spin up the scraper locally on your machine:

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 2. Install Dependencies
Navigate to this `server` directory in your terminal and install required packages:
```bash
cd server
npm install
```
> [!NOTE]
> During installation, Puppeteer automatically downloads a compatible version of headless Chromium to run the web scraper inside.

### 3. Launch the Server
Start the local Express server:
```bash
npm start
```
By default, the server runs on **port 3000** and will output:
```text
================================================
🚀 YCPP Self-Hosted Scraper API Running!
👉 Address: http://localhost:3000
👉 Scrape Endpoint: http://localhost:3000/api/scrape
================================================
```

---

## 🔌 API Documentation

### POST `/api/scrape`
Executes an automated browser session to fetch metrics for a target post.

#### Request Body
- `url` (String, Required): The target Facebook post URL.

```json
{
  "url": "https://www.facebook.com/john.chanthy/posts/pfbid0y6bV57KNr1wP9ChjJCL7DFQzePDBoms465ZMJyU5uxV8NMSKM16J1VhX6KVZzQdUl"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "likes": 42,
  "comments": 15,
  "shares": 8
}
```

#### Error Response (`400 Bad Request` or `500 Internal Server Error`)
```json
{
  "success": false,
  "error": "Detailed error message explanation."
}
```

---

## 🛡️ Key Features & Anti-Blocking Mechanisms

- **Puppeteer Stealth Plugin:** Emulates realistic browser parameters (navigator variables, plugins, WebGL fingerprinting) to prevent Chrome automation detection.
- **Organic User Agents:** Rotates modern, organic desktop user agents.
- **Resilient Parsing:** Ignores unstable obfuscated CSS class hashes. Instead, it matches elements via semantic accessibility attributes (`aria-label`, `role="button"`) and generic layout text queries (e.g. `Reactions: 123` or `123 comments`), preventing layout breaks when Facebook pushes updates.
