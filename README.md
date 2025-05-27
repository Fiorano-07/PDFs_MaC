# PDF Manage & Collab

A modern web application for managing and collaborating on PDF documents, built with Next.js 15 and Supabase.

## Features

- 📄 PDF Document Management
- 👥 Real-time Collaboration
- 🔍 Advanced PDF Viewing and Navigation
- 💾 Secure Document Storage
- 🎨 Modern UI with Tailwind CSS
- 🔐 Authentication and Authorization
- 📱 Responsive Design

## Tech Stack

- **Frontend Framework**: Next.js 15
- **Authentication & Database**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **PDF Processing**: react-pdf, pdfjs-dist
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Hooks
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- pnpm (v10 or higher)
- A Supabase account and project

## Getting Started

1. Clone the repository:
```bash
git clone [your-repository-url]
cd PDFs_MaC
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
PDFs_MaC/
├── app/           # Next.js app directory
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/          # Utility functions and configurations
├── public/        # Static assets
├── styles/       # Global styles and Tailwind CSS config
└── supabase/     # Supabase related configurations
```

## Database Schema

The application uses Supabase as its backend. The database schema can be found in `db_schema.sql`.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
