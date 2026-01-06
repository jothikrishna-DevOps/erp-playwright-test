import { Test, CreateTestRequest } from '@/shared/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

export async function fetchTests(): Promise<Test[]> {
  const response = await fetch(`${API_URL}/api/tests`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error('Failed to fetch tests')
  }
  return response.json()
}

export async function createTest(data: CreateTestRequest): Promise<Test> {
  const response = await fetch(`${API_URL}/api/tests/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create test')
  }
  return response.json()
}

export async function fetchFolders(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/tests/folders`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error('Failed to fetch folders')
  }
  return response.json()
}

export async function runTest(testId: string, mode: 'headless' | 'visible'): Promise<void> {
  const response = await fetch(`${API_URL}/api/tests/${testId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  })
  if (!response.ok) {
    throw new Error('Failed to run test')
  }
}

