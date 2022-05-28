import React from 'react';

interface LoadingProps {
  loading: boolean;
  progress?: number;
  children: any;
}

export default function Loading(props: LoadingProps) {
  return (
    <>
      {props.loading && (
        <div className='loadingBar-container'>
          <div className='loadingBar-progress' style={{ width: props.progress + '%' }}>
            &nbsp;
          </div>
        </div>
      )}
      {props.children}
    </>
  );
}
