import React from 'react';
import { render, screen } from '@testing-library/react';
import Landing from './Landing';

describe('landing', () => {
  it('landing', () => {
    render(<Landing />);
    const emailInput = screen.findByPlaceholderText('Email')
    expect(emailInput).toBeInTheDocument();
  })
})
