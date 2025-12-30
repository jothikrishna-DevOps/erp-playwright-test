'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserType } from '../../../shared/types'

export default function RecordPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    browser: 'chromium' as BrowserType
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
      const response = await fetch(`${API_URL}/api/tests/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start recording')
      }

      // Redirect to dashboard
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to start recording')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-earth-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-earth-600 hover:text-earth-700 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-light text-earth-900 mb-2">
            Record New Test
          </h1>
          <p className="text-earth-600">
            Start recording a new Playwright test. The browser will open on your local agent.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-earth-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-earth-700 mb-2">
                Test Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                placeholder="e.g., Login Flow Test"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-earth-700 mb-2">
                Application URL
              </label>
              <input
                type="url"
                id="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="browser" className="block text-sm font-medium text-earth-700 mb-2">
                Browser Type
              </label>
              <select
                id="browser"
                value={formData.browser}
                onChange={(e) => setFormData({ ...formData, browser: e.target.value as BrowserType })}
                className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
              >
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Starting Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-sage-50 border border-sage-200 rounded-lg p-4">
          <p className="text-sm text-sage-800">
            <strong>Note:</strong> Make sure your local agent is running and connected. 
            The browser will open on your local machine when you click "Start Recording".
          </p>
        </div>
      </div>
    </div>
  )
}

