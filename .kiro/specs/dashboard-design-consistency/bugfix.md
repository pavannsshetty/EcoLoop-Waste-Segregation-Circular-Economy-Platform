# Bugfix Requirements Document

## Introduction

The dashboard suffers from visual inconsistency across its UI components — cards, buttons, inputs, and section containers — in both light and dark modes. Issues include mixed border-radius values, missing or inconsistent borders, mismatched background shades, and poor dark mode cohesion (e.g., pure black backgrounds, invisible borders). This affects all user roles (citizen, collector, greenChampion) and shared components. The fix establishes a unified design system applied consistently across the entire dashboard.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a card or component is rendered THEN the system applies inconsistent border-radius values (some fully rounded, some sharp, some mixed) across different sections and roles
1.2 WHEN a card or component is rendered THEN the system renders some cards without any visible border, making section boundaries unclear
1.3 WHEN borders are present THEN the system applies different border styles, widths, or colors inconsistently across components and sections
1.4 WHEN the dashboard is viewed in dark mode THEN the system uses pure black (`#000000`) or near-black backgrounds that create harsh contrast and lack visual depth
1.5 WHEN the dashboard is viewed in dark mode THEN the system renders borders that are too dark or invisible against dark backgrounds
1.6 WHEN switching between light and dark mode THEN the system applies abrupt visual changes with no smooth transition
1.7 WHEN cards and sections are rendered THEN the system uses inconsistent background shades, making the layout feel visually fragmented
1.8 WHEN text is rendered across sections THEN the system applies inconsistent text colors and contrast levels between components and themes
1.9 WHEN UI elements (cards, buttons, inputs) are rendered THEN the system does not follow a unified design system, resulting in mixed visual styles

### Expected Behavior (Correct)

2.1 WHEN a card or component is rendered THEN the system SHALL apply a uniform border-radius of 0–4px across all cards and components in all role dashboards and shared components
2.2 WHEN a card or component is rendered THEN the system SHALL display a subtle 1px solid border on all cards and section containers to clearly define boundaries
2.3 WHEN borders are rendered THEN the system SHALL apply the same border style, width, and color token consistently across all components and sections
2.4 WHEN the dashboard is viewed in dark mode THEN the system SHALL use layered dark tones (e.g., `gray-900`, `gray-800`, `gray-700`) instead of pure black to create visual depth
2.5 WHEN the dashboard is viewed in dark mode THEN the system SHALL render borders using a slightly lighter color token (e.g., `gray-600` or `gray-700`) to remain visible against dark backgrounds
2.6 WHEN switching between light and dark mode THEN the system SHALL apply a smooth CSS transition (e.g., `transition-colors duration-300`) to all themed elements
2.7 WHEN cards and sections are rendered THEN the system SHALL use consistent background shade tokens for light mode (e.g., `white` / `gray-50`) and dark mode (e.g., `gray-900` / `gray-800`) across all roles
2.8 WHEN text is rendered across sections THEN the system SHALL apply consistent text color tokens with sufficient contrast in both light (`gray-900`) and dark (`gray-100`) modes
2.9 WHEN UI elements (cards, buttons, inputs) are rendered THEN the system SHALL conform to a single shared design system with unified spacing, alignment, border, and color tokens

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user interacts with role-specific dashboard features (citizen, collector, greenChampion) THEN the system SHALL CONTINUE TO render all functional content and data correctly
3.2 WHEN the ThemeContext toggles between light and dark mode THEN the system SHALL CONTINUE TO apply the correct theme class to the document root
3.3 WHEN shared components (modals, toasts, notifications, skeleton loaders) are rendered THEN the system SHALL CONTINUE TO function correctly and display their content
3.4 WHEN layout components (CitizenLayout, CollectorLayout, GreenChampionLayout) are rendered THEN the system SHALL CONTINUE TO provide correct navigation and page structure
3.5 WHEN the dashboard is viewed on different screen sizes THEN the system SHALL CONTINUE TO maintain responsive layout behavior
3.6 WHEN buttons and inputs are interacted with THEN the system SHALL CONTINUE TO respond to user actions (clicks, focus, hover) without regression
