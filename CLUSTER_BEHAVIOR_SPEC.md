# Map Pin Zoom & Split Behavior Specification

## Initial State (World View)

- When the site loads, the map shows the full world view.
- Pins are clustered and displayed as:
   - A single circular bubble
   - One or more colors
   - A number representing the total number of news articles inside that cluster

---

## General Rules

1. **Each user click causes exactly ONE zoom step**
   - No continuous zooming
   - No pinch-to-zoom behavior tied to this logic
2. **After a click-triggered zoom:**
   - Further zooming on that interaction is disabled
3. **If multiple items share the same geographic coordinates:**
   - Use a spiderfy (spiderfly) effect to spread them slightly apart
   - Items must remain close to the original location
   - All items must be individually clickable

---

## Case 1: Single-Color Cluster

**Example:**
- A blue pin with number "6" (6 articles, all same category)

**On first click:**
- Zoom in once
- Apply spiderfy effect
- Display all 6 items spread out around the original position
- Disable further zooming from this cluster
- Each item is now directly clickable

**No additional splitting is needed** since all items are the same category.

---

## Case 2: Multi-Color Cluster (Category Split)

**Example:**
- A pin showing "10" articles
- Contains 2 or 3 different colors (categories)

**On first click:**
- Zoom in once
- Split the original cluster into separate category bubbles
   - 2 colors → split into 2 bubbles
   - 3 colors → split into 3 bubbles
- Each new bubble:
   - Has one color
   - Shows the article count for that category
   - Is positioned close to the original cluster
- **No spiderfy at this stage yet**

---

## Case 3: Clicking a Category Bubble

(After a split from Case 2)

**On click of a category bubble:**
- Zoom in once
- Apply spiderfy effect
- Spread all articles in that category so they are individually clickable
- Disable further zooming for that interaction

---

## Summary of Interaction Flow

- **World view** → clustered bubbles
- **Click #1:**
   - Always zoom once
   - Either:
      - Spiderfy items (single-color)
      - OR split by category (multi-color)
- **Click #2** (on a category bubble):
   - Zoom once
   - Spiderfy items
- **No click ever triggers more than one zoom step**

---

## Key Constraints

- ✅ No automatic continuous zoom
- ✅ No overlapping clickable items
- ✅ Spiderfy only happens when showing individual articles
- ✅ Category splitting happens before spiderfy, not after

---

## Implementation Status

- [ ] Review current cluster click handler logic
- [ ] Implement single zoom step (disable multi-zoom)
- [ ] Implement Case 1: Single-color → zoom + spiderfy
- [ ] Implement Case 2: Multi-color → zoom + category split
- [ ] Implement Case 3: Category bubble → zoom + spiderfy
- [ ] Test all cases for consistency
- [ ] Verify no further zooming after interaction completes
