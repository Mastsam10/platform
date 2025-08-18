'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChannelForm from '@/components/ChannelForm'

export default function CreateChannelPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (channelData: any) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create channel')
      }

      const result = await response.json()
      
      // Redirect to the new channel page
      router.push(`/c/${result.channel.slug}`)
    } catch (error) {
      console.error('Error creating channel:', error)
      alert(error instanceof Error ? error.message : 'Failed to create channel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your Channel
              </h1>
              <p className="text-gray-600">
                Set up your channel to start sharing videos with your community.
              </p>
            </div>

            <ChannelForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
