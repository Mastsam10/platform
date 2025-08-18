'use client'

import { useState, useEffect } from 'react'
import { ChannelType } from './ChannelTypeSelector'
import ChannelTypeSelector from './ChannelTypeSelector'

interface ChannelFormData {
  slug: string
  display_name: string
  type: ChannelType
  about?: string
  denomination?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  timezone?: string
  avatar_url?: string
  banner_url?: string
}

interface ChannelFormProps {
  initialData?: Partial<ChannelFormData>
  onSubmit: (data: ChannelFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

const DENOMINATIONS = [
  'Baptist', 'Catholic', 'Lutheran', 'Methodist', 'Presbyterian', 'Episcopal',
  'Orthodox', 'Pentecostal', 'Evangelical', 'Non-denominational', 'Other'
]

export default function ChannelForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: ChannelFormProps) {
  const [formData, setFormData] = useState<ChannelFormData>({
    slug: '',
    display_name: '',
    type: 'individual',
    about: '',
    denomination: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    timezone: '',
    avatar_url: '',
    banner_url: '',
    ...initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)

  // Auto-generate slug from display name
  useEffect(() => {
    if (formData.display_name && !formData.slug) {
      const generatedSlug = formData.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      
      setFormData(prev => ({ ...prev, slug: generatedSlug }))
    }
  }, [formData.display_name, formData.slug])

  // Check slug availability
  useEffect(() => {
    if (formData.slug && formData.slug.length >= 3) {
      const checkSlug = async () => {
        setIsCheckingSlug(true)
        try {
          const response = await fetch(`/api/channels?slug=${formData.slug}`)
          const data = await response.json()
          setSlugAvailable(data.channels.length === 0)
        } catch (error) {
          console.error('Error checking slug:', error)
          setSlugAvailable(null)
        } finally {
          setIsCheckingSlug(false)
        }
      }

      const timeoutId = setTimeout(checkSlug, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSlugAvailable(null)
    }
  }, [formData.slug])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Channel name is required'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Channel URL is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Channel URL can only contain lowercase letters, numbers, and hyphens'
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Channel URL must be at least 3 characters'
    } else if (slugAvailable === false) {
      newErrors.slug = 'This channel URL is already taken'
    }

    if (formData.type === 'church') {
      if (!formData.denomination.trim()) {
        newErrors.denomination = 'Denomination is required for church channels'
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required for church channels'
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required for church channels'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (slugAvailable === false) {
      setErrors(prev => ({ ...prev, slug: 'This channel URL is already taken' }))
      return
    }

    await onSubmit(formData)
  }

  const handleInputChange = (field: keyof ChannelFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Channel Type Selection */}
      <ChannelTypeSelector
        value={formData.type}
        onChange={(type) => handleInputChange('type', type)}
      />

      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
            Channel Name *
          </label>
          <input
            type="text"
            id="display_name"
            value={formData.display_name}
            onChange={(e) => handleInputChange('display_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.display_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your channel name"
          />
          {errors.display_name && (
            <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Channel URL *
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              platform.com/c/
            </span>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.slug ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="your-channel-url"
            />
          </div>
          {isCheckingSlug && (
            <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
          )}
          {slugAvailable === true && (
            <p className="mt-1 text-sm text-green-600">✓ Channel URL is available</p>
          )}
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
          )}
        </div>

        <div>
          <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="about"
            value={formData.about}
            onChange={(e) => handleInputChange('about', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell people about your channel..."
          />
        </div>
      </div>

      {/* Church-specific fields */}
      {formData.type === 'church' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Church Information</h3>
          
          <div>
            <label htmlFor="denomination" className="block text-sm font-medium text-gray-700 mb-1">
              Denomination *
            </label>
            <select
              id="denomination"
              value={formData.denomination}
              onChange={(e) => handleInputChange('denomination', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                errors.denomination ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select denomination</option>
              {DENOMINATIONS.map((denom) => (
                <option key={denom} value={denom}>{denom}</option>
              ))}
            </select>
            {errors.denomination && (
              <p className="mt-1 text-sm text-red-600">{errors.denomination}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.city ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter city"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.state ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select state</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter ZIP code"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select timezone</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Anchorage">Alaska Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isCheckingSlug || slugAvailable === false}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Channel'}
        </button>
      </div>
    </form>
  )
}
