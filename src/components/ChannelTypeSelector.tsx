'use client'

import { useState } from 'react'

export type ChannelType = 'individual' | 'church' | 'organization'

interface ChannelTypeSelectorProps {
  value: ChannelType
  onChange: (type: ChannelType) => void
}

const channelTypes = [
  {
    id: 'individual' as ChannelType,
    title: 'Individual Creator',
    description: 'Personal ministry, teaching, or content creation',
    icon: '👤',
    features: ['Personal brand', 'Content creation', 'Ministry focus'],
    examples: ['Pastor John\'s Bible Study', 'Faith & Family Blog']
  },
  {
    id: 'church' as ChannelType,
    title: 'Church',
    description: 'Local church or ministry organization',
    icon: '⛪',
    features: ['Location-based', 'Service times', 'Community focus'],
    examples: ['Grace Community Church', 'First Baptist Downtown']
  },
  {
    id: 'organization' as ChannelType,
    title: 'Organization',
    description: 'Ministry organization, non-profit, or business',
    icon: '🏢',
    features: ['Team-based', 'Brand identity', 'Multiple locations'],
    examples: ['Christian Youth Ministry', 'Faith-Based Non-Profit']
  }
]

export default function ChannelTypeSelector({ value, onChange }: ChannelTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          What type of channel is this?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channelTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={`
                relative p-6 text-left border-2 rounded-lg transition-all duration-200
                ${value === type.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{type.icon}</span>
                <h3 className="font-semibold text-gray-900">{type.title}</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{type.description}</p>
              
              <div className="space-y-1 mb-4">
                {type.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                    {feature}
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">Examples:</div>
                {type.examples.map((example, index) => (
                  <div key={index} className="italic">"{example}"</div>
                ))}
              </div>
              
              {value === type.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
