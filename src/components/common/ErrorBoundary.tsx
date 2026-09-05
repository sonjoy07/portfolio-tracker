import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'

interface ErrorBoundaryProps {
  label: string
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info)
  }

  private retry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <TriangleAlert size={20} className="text-amber-500" />
        <p className="text-sm font-semibold">Something went wrong in the {this.props.label}</p>
        <p className="text-xs text-slate-400">This section failed to render. Try refreshing it below.</p>
        <button
          type="button"
          onClick={this.retry}
          className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RotateCw size={12} />
          Try again
        </button>
      </section>
    )
  }
}