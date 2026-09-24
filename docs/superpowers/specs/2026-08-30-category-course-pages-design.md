# Category Course Pages Design

## Goal

Add dedicated Trading Courses and Platform Courses pages that reuse the landing-page presentation while showing only the selected category's featured course and carousel.

## User-facing behavior

- The header's Trading Courses item navigates to `/trading-courses`.
- The header's Platform Courses item navigates to `/platform-courses`.
- Each category page displays the first course in that category as the temporary featured hero.
- Each category page displays one carousel containing only courses from that category.
- Existing card hover previews, course navigation, lessons list, and page transitions continue to work.
- The home page keeps its current featured hero and all existing course rows.
- Store remains non-navigating until its destination URL is provided.

## Architecture

Reuse `CourseCatalog` with a route-derived catalog mode rather than creating duplicate page components. The route configuration supplies the category mode; the component filters its existing course data and chooses the first filtered course as the temporary category featured course. This keeps the future backend featured-course change localized to the selection function.

The existing row-scroll directive and card/preview markup remain the shared presentation layer. Category pages use the same styles and interaction handlers, with only the displayed data and route navigation changing.

## Future backend compatibility

The temporary featured selection is the first course in the filtered category. A later backend `featured` flag or featured-course ID can replace that selection without changing routes, templates, or styling.

## Validation

- TypeScript and Angular template compilation must pass with `npm run build`.
- Verify both new routes render the category hero and one category carousel.
- Verify header links navigate correctly and Store does not navigate.
- Verify the home route still renders all existing rows.
