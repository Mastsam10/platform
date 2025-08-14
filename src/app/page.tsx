import VideoUpload from '@/components/VideoUpload'
import VideoList from '@/components/VideoList'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Christian Video Platform
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
          Discover and share Christian videos with scripture-aware chapters
        </p>
        <div className="flex justify-center space-x-4">
          <Link 
            href="/test" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            Test Page
          </Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <VideoUpload />
        </div>
        <div>
          <VideoList />
        </div>
      </div>
    </div>
  )
}
