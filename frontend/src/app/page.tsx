'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Test } from '@/shared/types'
import { fetchTests } from '@/lib/api'

export default function Dashboard() {
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'folder'>('folder')

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

  // Extract folder name from file path
  const getFolderName = (filePath?: string): string => {
    if (!filePath) return 'No File'
    const parts = filePath.split('/')
    const testsIndex = parts.indexOf('tests')
    if (testsIndex >= 0 && testsIndex < parts.length - 1) {
      return parts[testsIndex + 1]
    }
    return 'Unknown'
  }

  // Group tests by folder or date
  const groupedTests = () => {
    if (groupBy === 'none') {
      return { 'All Tests': tests }
    }
    
    if (groupBy === 'folder') {
      const grouped: Record<string, Test[]> = {}
      tests.forEach(test => {
        const folder = getFolderName(test.filePath)
        if (!grouped[folder]) {
          grouped[folder] = []
        }
        grouped[folder].push(test)
      })
      return grouped
    }
    
    if (groupBy === 'date') {
      const grouped: Record<string, Test[]> = {}
      tests.forEach(test => {
        const date = new Date(test.createdAt).toLocaleDateString()
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(test)
      })
      return grouped
    }
    
    return { 'All Tests': tests }
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
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/record"
            className="inline-flex items-center px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Record New Test
          </Link>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-earth-600">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'date' | 'folder')}
              className="px-3 py-1.5 border border-earth-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none text-sm"
            >
              <option value="folder">Folder</option>
              <option value="date">Date</option>
              <option value="none">None</option>
            </select>
          </div>
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
            <div className="divide-y divide-earth-200">
              {Object.entries(groupedTests()).map(([groupName, groupTests]) => (
                <div key={groupName} className="py-4">
                  {groupBy !== 'none' && (
                    <div className="px-6 py-2 bg-earth-100 border-b border-earth-200">
                      <h3 className="text-sm font-semibold text-earth-800 flex items-center gap-2">
                        {groupBy === 'folder' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        )}
                        {groupBy === 'date' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {groupName}
                        <span className="text-earth-500 font-normal ml-2">({groupTests.length})</span>
                      </h3>
                    </div>
                  )}
                  <table className="min-w-full divide-y divide-earth-200">
                    <thead className="bg-earth-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                          Test Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-earth-700 uppercase tracking-wider">
                          Description
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
                      {groupTests.map((test) => (
                        <tr key={test.id} className="hover:bg-earth-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-earth-900">{test.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-earth-600 max-w-xs">
                              {test.description ? (
                                <span className="line-clamp-2">{test.description}</span>
                              ) : (
                                <span className="text-earth-400 italic">No description</span>
                              )}
                            </div>
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
                                  className="inline-flex items-center text-earth-600 hover:text-earth-700 px-3 py-1 rounded hover:bg-earth-50 transition-colors"
                                  title="Download test file"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

