# 📮 PostBoy - API Client & Proxy Server

A lightweight, self-hosted API client and HTTP proxy server built with Flask. Test and manage your API requests with an intuitive interface, organize them into collections, and proxy requests through a local server - all without any external API dependencies.

## ✨ Features

### 🗂️ Collections Management
- **Hierarchical Collections** - Organize requests in nested folders/collections
- **Drag & Drop** - Reorder collections and requests with intuitive drag-and-drop
- **CRUD Operations** - Create, read, update, and delete collections
- **Duplicate** - Clone entire collections including all sub-collections and requests
- **Recursive Delete** - Delete a collection and all its children in one action

### 📝 Request Management
- **Multiple HTTP Methods** - GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Builder** - Full control over URL, headers, and request body
- **Body Types** - Support for JSON, XML, plain text, form-data, and URL-encoded forms
- **Authentication** - Built-in support for Basic Auth and Bearer Token
- **Headers Editor** - Add, edit, and remove custom headers
- **Move Requests** - Easily move requests between collections

### 🔄 Import & Export
- **Postman Import** - Import Postman v2.1 collections directly
- **cURL Import** - Paste cURL commands and convert them to requests
- **Collection Export** - Export collections (coming soon)

### 🚀 HTTP Proxy
- **Local Proxy** - Send requests through the built-in proxy to bypass CORS
- **Response Viewer** - View status codes, response headers, and body
- **Timing Info** - See request duration in milliseconds
- **JSON Formatting** - Automatic JSON response formatting and syntax highlighting

### 💾 Data Storage
- **SQLite Database** - All data stored locally in a single file
- **No Database Setup** - Zero configuration required
- **Portable** - Move your database file to backup or transfer data
- **Instant Persistence** - Changes saved automatically

### 🎨 User Interface
- **Clean Interface** - Modern, intuitive design
- **Responsive Layout** - Works on desktop and tablet
- **Dark/Light Theme** - Choose your preferred theme
- **No External Services** - Everything runs locally

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/postboy-flask.git
cd postboy-flask
```

2. **Create a virtual environment (recommended)**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the server**
```bash
python app.py
```

5. **Open your browser**
```
http://localhost:3001
```

### Port Configuration
The server defaults to port 3001. If that port is busy, it will automatically try the next available port (3002, 3003, etc.).

To set a custom port:
```bash
# Windows
set PORT=8080
python app.py

# Linux/macOS
PORT=8080 python app.py
```

## 📁 Project Structure

```
postboy-flask/
├── app.py                 # Thin server entrypoint
├── db.py                  # Database layer (SQLite)
├── requirements.txt       # Python dependencies
├── README.md              # This file
├── public/                # Frontend static files
│   ├── index.html         # Main application
│   ├── style.css          # Stylesheet
│   └── script.js          # Frontend behavior
└── pypostboy/             # Package-based Flask backend
    ├── app.py             # Application factory
    ├── http/              # Shared HTTP response helpers
    ├── routes/            # Blueprint route modules
    └── services/          # Import, cURL parsing, and proxy services
```

## 🛠️ API Endpoints

PostBoy exposes a REST API that you can use to manage collections and requests programmatically:

### Collections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collections` | List all collections |
| GET | `/api/collections/:id` | Get collection with requests |
| POST | `/api/collections` | Create collection |
| PUT | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection |
| POST | `/api/collections/:id/duplicate` | Duplicate collection |

### Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requests/:id` | Get request details |
| GET | `/api/collections/:id/requests` | List requests in collection |
| POST | `/api/requests` | Create request |
| PUT | `/api/requests/:id` | Update request |
| DELETE | `/api/requests/:id` | Delete request |
| POST | `/api/requests/:id/duplicate` | Duplicate request |
| PUT | `/api/requests/:id/move` | Move to another collection |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import` | Import Postman/cURL |
| POST | `/api/proxy` | Proxy HTTP request |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port number |

### Security Notes

- PostBoy is designed for **local development** use
- No authentication is required (runs on localhost)
- The proxy endpoint forwards requests as-is
- Sensitive data (API keys, tokens) is stored in the local SQLite database
- Do not expose PostBoy to public networks without additional security

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Postman and Insomnia
- Built with Flask and SQLite
- Uses vanilla JavaScript for the frontend

## 🚦 Status

PostBoy is actively maintained and ready for daily use. Report bugs and request features through GitHub Issues.

---

**Made with ❤️ for developers who want a simple, local API testing tool.**# pypostboy
