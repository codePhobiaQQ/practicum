import { Component, ErrorInfo, ReactNode, Suspense } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps,
  ErrorBoundaryState> {

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log(error, errorInfo)
  }

  render() {
    const { hasError } = this.state
    const { children } = this.props

    if (hasError) {
      return (
        <Suspense fallback='Loading...'>
          <h1>Something wrong.</h1>
        </Suspense>
      )
    }

    return children
  }
}
