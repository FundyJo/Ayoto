# UI Preview and Design

This document describes the user interface and design of Ayoto.

## Color Scheme

The application uses a beautiful gradient color scheme:

- **Primary Gradient**: Purple to violet (`#667eea` to `#764ba2`)
- **Accent Colors**: 
  - Green for actions (`#10b981`)
  - Purple for secondary actions (`#8b5cf6`)
- **Text**: White text on gradient backgrounds
- **Cards**: Semi-transparent white overlays (`rgba(255, 255, 255, 0.1)`)

## Layout

### Header
```
╔═══════════════════════════════════════════════════════╗
║  🎌 Ayoto - Anime Streaming                          ║
║  Provider: Example Provider                           ║
╚═══════════════════════════════════════════════════════╝
```

- Large title with emoji
- Provider information displayed
- Dark semi-transparent background

### Search Bar
```
╔═══════════════════════════════════════════════════════╗
║  [     Search for anime...      ] [Search] [📱 Cast] ║
╚═══════════════════════════════════════════════════════╝
```

- Large search input with rounded corners
- Green "Search" button
- Purple "Cast" button with icon
- Responsive: stacks vertically on mobile

### Main Content Area

#### Empty State (No Search)
```
┌───────────────────────────────────────────────────────┐
│                                                       │
│         Search for your favorite anime                │
│   Use the search bar above to find anime to watch    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

#### Search Results (Grid View)
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ [Image] │  │ [Image] │  │ [Image] │  │ [Image] │
│  Title  │  │  Title  │  │  Title  │  │  Title  │
│ Desc... │  │ Desc... │  │ Desc... │  │ Desc... │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

- Responsive grid (4 columns on desktop, 2 on tablet, 1 on mobile)
- Hover effects: cards lift up with shadow
- Semi-transparent card backgrounds
- Thumbnail images at top
- Title and truncated description

#### Anime Detail View
```
┌─────────────────────────────────────────────────────┐
│  [← Back to Results]                                │
│                                                     │
│  ┌────────┐  Title: Demo Anime                    │
│  │ Image  │  Description: This is a demo anime... │
│  │        │                                        │
│  └────────┘                                        │
│                                                     │
│  Episodes                                           │
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │ [Thumbnail]      │  │ [Thumbnail]      │       │
│  │ Episode 1        │  │ Episode 2        │       │
│  │ Title            │  │ Title            │       │
│  │ [▶ Play]         │  │ [▶ Play]         │       │
│  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────┘
```

- Back button at top
- Large anime poster on left
- Title and description on right
- Episode grid below
- Each episode shows thumbnail, number, title, and play button

### Cast Device Selector (Modal)
```
┌─────────────────────────────────────┐
│  Select Cast Device                 │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Demo TV                      │  │
│  │ 192.168.1.100               │  │
│  └──────────────────────────────┘  │
│                                     │
│  [Close]                           │
└─────────────────────────────────────┘
```

- Center overlay modal
- White background with shadow
- Device list with names and IPs
- Hover effect on device items
- Close button at bottom

## Typography

- **Headers (h1)**: 2.5rem (40px), bold
- **Subheaders (h2)**: 2rem (32px), bold
- **Card titles (h3)**: 1.2rem, semi-bold
- **Body text**: 1rem (16px), regular
- **Small text**: 0.9rem (14px)

## Spacing

- **Page padding**: 2rem (32px)
- **Card gap**: 2rem on desktop, 1rem on mobile
- **Section spacing**: 3rem between major sections
- **Card padding**: 1-2rem depending on card type

## Interactive Elements

### Buttons
- Rounded corners (8px border radius)
- Padding: 1rem 2rem
- Hover: Slightly darker color + lift effect
- Active: Scale down slightly
- Disabled: Reduced opacity (50%)

### Cards
- Rounded corners (12px)
- Semi-transparent backgrounds
- Hover: Lift up 8px with shadow
- Transition: 0.3s ease for all effects

### Inputs
- Large, rounded text fields
- White background with slight transparency
- Border: 2px solid rgba(255, 255, 255, 0.3)
- Focus: Highlighted border

## Responsive Breakpoints

### Desktop (> 768px)
- 4-column grid for anime cards
- 2-column grid for episodes
- Horizontal layout for search bar
- Side-by-side anime info layout

### Tablet (768px)
- 2-column grid for anime cards
- 1-column grid for episodes
- Horizontal search bar
- Stacked anime info

### Mobile (< 768px)
- 1-column grid for all content
- Vertical search bar
- Full-width cards
- Simplified layouts

## Accessibility

### Implemented
- ✅ Semantic HTML elements
- ✅ Keyboard navigation support
- ✅ Sufficient color contrast
- ✅ Clear focus indicators
- ✅ Responsive text sizing

### To Implement
- ⏳ ARIA labels
- ⏳ Screen reader support
- ⏳ High contrast mode
- ⏳ Reduced motion support

## Animations

### Hover Effects
- Cards: `transform: translateY(-8px)`
- Buttons: `transform: translateY(-2px)`
- Duration: 0.3s
- Easing: ease-out

### Page Transitions
- Fade in: 0.3s ease
- Slide in: 0.3s ease

### Loading States
- Opacity changes
- Disabled state styling

## Icons & Images

### Icons
- Emoji used for simplicity: 🎌 (app), 📱 (cast), ▶ (play)
- No icon library dependency
- Clean, minimal design

### Images
- Placeholder images from placeholder services
- Lazy loading (future enhancement)
- Object-fit: cover for consistent sizing
- Rounded corners on all images

## Dark Mode

Currently: Single theme (dark gradient)

Future: Could add light mode with:
- Light gradient background
- Dark text
- Adjusted card backgrounds
- Toggle in settings

## Example Screen Descriptions

### Main Search Screen
```
+----------------------------------------------------------+
|  🎌 Ayoto - Anime Streaming                             |
|  Provider: Example Provider                              |
+----------------------------------------------------------+
|  [     Search for anime...      ] [Search] [📱 Cast]    |
+----------------------------------------------------------+
|                                                          |
|    [Anime Card 1]  [Anime Card 2]  [Anime Card 3]      |
|    [Anime Card 4]  [Anime Card 5]  [Anime Card 6]      |
|                                                          |
+----------------------------------------------------------+
```

### Episode View
```
+----------------------------------------------------------+
|  🎌 Ayoto - Anime Streaming                             |
|  Provider: Example Provider                              |
+----------------------------------------------------------+
|  [← Back to Results]                                     |
|                                                          |
|  [Poster]   Naruto                                      |
|  [Image ]   A young ninja's journey...                  |
|                                                          |
|  Episodes                                                |
|  [Episode 1: The Beginning    ] [▶ Play]               |
|  [Episode 2: New Challenges   ] [▶ Play]               |
|  [Episode 3: Training         ] [▶ Play]               |
|                                                          |
+----------------------------------------------------------+
```

## Design Philosophy

1. **Simplicity**: Clean, uncluttered interface
2. **Consistency**: Uniform spacing, colors, and patterns
3. **Responsiveness**: Works on all screen sizes
4. **Accessibility**: Usable by everyone
5. **Performance**: Fast, smooth animations
6. **Beauty**: Attractive gradient design

## Future Enhancements

### UI Improvements
- [ ] Video player integration
- [ ] Progress indicators
- [ ] Skeleton loading states
- [ ] Toast notifications
- [ ] Keyboard shortcuts
- [ ] Context menus
- [ ] Drag and drop
- [ ] Advanced filters
- [ ] Grid/list view toggle
- [ ] Sort options

### Visual Polish
- [ ] Custom loading animations
- [ ] Micro-interactions
- [ ] Page transitions
- [ ] Parallax effects
- [ ] Custom scrollbars
- [ ] Glassmorphism effects
- [ ] Particle backgrounds

### Themes
- [ ] Light mode
- [ ] Custom theme colors
- [ ] User-created themes
- [ ] Seasonal themes

## Testing the UI

### Manual Testing
1. Launch app: `cargo tauri dev`
2. Search for anime
3. Click on result
4. View episodes
5. Test cast button
6. Resize window
7. Test on mobile (if available)

### Visual Testing
- Check all breakpoints
- Verify hover states
- Test focus indicators
- Check color contrast
- Validate animations
- Test with slow network

## Design Assets

### Needed
- Proper application icon (PNG, 1024x1024)
- Splash screen (optional)
- Promotional images
- Social media cards

### Current
- Placeholder icon files
- No splash screen
- No promotional assets

## Feedback

The UI is designed to be:
- **Intuitive**: Easy to understand without instructions
- **Fast**: Responsive interactions
- **Beautiful**: Pleasant to look at
- **Functional**: Everything works as expected

Users should feel:
- Welcomed by the clean design
- Confident in navigation
- Excited to discover anime
- Satisfied with the experience

---

For code-level details, see:
- `frontend/src/App.tsx` - React components
- `frontend/src/App.css` - Styling
- `frontend/src/index.css` - Global styles
