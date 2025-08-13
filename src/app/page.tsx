import AuthButton from '@/components/AuthButton'
import VideoUpload from '@/components/VideoUpload'
import VideoPlayer from '@/components/VideoPlayer'
import VideoList from '@/components/VideoList'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Christian Video Platform
          </h1>
          <p className="text-lg text-gray-600">
            Discover and share Christian videos with scripture-aware chapters
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Discover</h3>
            <p className="text-gray-600">
              Find videos by scripture passage, topic, denomination, or location.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Upload</h3>
            <p className="text-gray-600">
              Share your sermons and teachings with automatic scripture chapters.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Connect</h3>
            <p className="text-gray-600">
              Find churches near you and plan your visit.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Support</h3>
            <p className="text-gray-600">
              Tip creators and support your local churches.
            </p>
          </div>
        </div>

        {/* Video List */}
        <div className="mb-12">
          <VideoList />
        </div>

        {/* Demo Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Try It Out</h2>
            <VideoUpload />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4">Sample Video</h2>
            <VideoPlayer 
              playbackId="demo-playback-id" 
              title="Sample Sermon"
              className="bg-gray-100 p-4 rounded-lg"
            />
          </div>
        </div>

        {/* Auth Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <AuthButton />
        </div>
      </div>
    </main>
  )
}
