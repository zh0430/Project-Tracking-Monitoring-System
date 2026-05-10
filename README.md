# Project Tracking & Monitoring System

A full-stack web application designed to help teams manage, monitor, and track project progress efficiently. This system provides separate admin and user interfaces for managing projects, assigning tasks, tracking completion status, and visualizing project performance through dashboards and charts.


## Features

### Admin Features

* Admin dashboard overview
* Project progress monitoring
* Team Gantt chart tracking
* Employee performance summary
* User management system
* Task assignment module
* Project update management
* Document management system
* Project distribution analytics
* Incomplete project tracking
* Admin settings management

### User Features

* User authentication and login
* Project submission form
* Manage assigned projects
* Gantt chart tracking
* Historical project view
* Export project data
* User settings management
* Password recovery/change module
* Detailed project viewing

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Recharts
* Axios
* React Router DOM

### Backend

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication
* Multer (File Upload)

---

## Project Structure

```bash
Project Tracking Website System/
│
├── backend/
│   ├── src/
│   ├── uploads/
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/zh0430/Project-Tracking-Monitoring-System.git
```

---

## Backend Setup

### Navigate to backend folder

```bash
cd backend
```

### Install dependencies

```bash
npm install
```

### Run backend server

```bash
npm run dev
```

Backend server will run on:

```bash
http://localhost:5000
```

---

## Frontend Setup

### Navigate to frontend folder

```bash
cd frontend
```

### Install dependencies

```bash
npm install
```

### Start frontend development server

```bash
npm run dev
```

Frontend server will run on:

```bash
http://localhost:5173
```

---

## Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection
JWT_SECRET=your_secret_key
```

---

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
```

### Backend

```bash
npm run dev
npm start
```

---

## System Modules

* Authentication & Authorization
* Project Management
* Task Assignment
* Dashboard Analytics
* File Upload Management
* Employee Monitoring
* Historical Tracking
* Data Exporting

---

## Future Improvements

* Email notification system
* Real-time project updates
* Mobile responsive optimization
* Advanced analytics dashboard
* Role-based permissions
* Cloud deployment support

---

## License

This project is developed for educational and project management purposes.

  
