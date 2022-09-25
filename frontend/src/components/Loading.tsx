import { ReactNode } from 'react'

import './Loading'

interface LoadingProps {
  loading: boolean
  progress?: number
  children: ReactNode | ReactNode[]
}

export default function Loading(props: LoadingProps) {
  return (
    <>
      {props.loading && (
        <div className='loadingBar-container'>
          <div className='loadingBar-progress' style={{ width: `${props.progress || ''}%` }}>
            &nbsp;
          </div>
        </div>
      )}
      {props.children}
    </>
  )
}
