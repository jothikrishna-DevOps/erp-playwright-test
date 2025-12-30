'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Test } from '../../shared/types'
import { fetchTests } from '@/lib/api'

export default function Dashboard() {
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTests()
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTests, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadTests = async () => {
    try {
      const data = await fetchTests()
      setTests(data)
    } catch (error) {
      console.error('Failed to load tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async (testId: string, mode: 'headless' | 'visible') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
      const response = await fetch(`${API_URL}/api/tests/${testId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      if (!response.ok) throw new Error('Failed to run test')
      loadTests()
    } catch (error) {
      console.error('Failed to run test:', error)
      alert('Failed to run test')
    }
  }

  const handleDownload = (testId: string, testName: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
    window.open(`${API_URL}/api/tests/${testId}/download`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-sage-500 text-white'
      case 'running': return 'bg-amber-500 text-white'
      case 'recording': return 'bg-blue-500 text-white'
      case 'completed': return 'bg-green-600 text-white'
      case 'failed': return 'bg-red-500 text-white'
      default: return 'bg-earth-300 text-earth-800'
    }
  }

  return (
    <div className="min-h-screen bg-earth-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-light text-earth-900 mb-2">
            Playwright Test Platform
          </h1>
          <p className="text-earth-600 text-lg">
            Record and run tests with visible browser control
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <Link
            href="/record"
            className="inline-flex items-center px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Record New Test
          </Link>
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-lg shadow-sm border border-earth-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-earth-600">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
              <p className="mt-4">Loading tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="p-12 text-center text-earth-600">
              <p className="text-lg mb-2">No tests yet</p>
              <p className="text-sm">Start by recording your first test</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-earth-200">
              <thead className="bg-earth-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-earth-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-earth-200">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-earth-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-earth-900">{test.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-earth-600 truncate max-w-xs">{test.url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-earth-600">{test.createdBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-earth-600">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {test.status === 'ready' && (
                          <>
                            <button
                              onClick={() => handleRun(test.id, 'headless')}
                              className="text-sage-600 hover:text-sage-700 px-3 py-1 rounded hover:bg-sage-50 transition-colors"
                            >
                              Run (Headless)
                            </button>
                            <button
                              onClick={() => handleRun(test.id, 'visible')}
                              className="text-sage-600 hover:text-sage-700 px-3 py-1 rounded hover:bg-sage-50 transition-colors"
                            >
                              Run (Visible)
                            </button>
                          </>
                        )}
                        {test.filePath && (
                          <button
                            onClick={() => handleDownload(test.id, test.name)}
                            className="text-earth-600 hover:text-earth-700 px-3 py-1 rounded hover:bg-earth-50 transition-colors"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

