import { afterEach, describe, expect, it, jest } from '@jest/globals'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function CrashChild(): ReactNode {
  throw new Error('boom')
}

function renderBoundary(children: ReactNode, label = 'test') {
  return render(<ErrorBoundary label={label}>{children}</ErrorBoundary>)
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    renderBoundary(<div>Healthy section</div>)
    expect(screen.getByText('Healthy section')).toBeInTheDocument()
  })

  it('renders the fallback when a child throws', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    renderBoundary(<CrashChild />)
    expect(screen.getByText(/Something went wrong in the test/)).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('recovers and re-renders children after "Try again"', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    let crash = true
    const FlakyChild = (): ReactNode => {
      if (crash) throw new Error('flaky')
      return <div>Recovered</div>
    }

    renderBoundary(<FlakyChild />)
    expect(screen.getByText(/Something went wrong in the test/)).toBeInTheDocument()

    await act(async () => {
      crash = false
    })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Recovered')).toBeInTheDocument()
    errorSpy.mockRestore()
  })
})