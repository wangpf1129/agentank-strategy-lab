# Map Playbook

Use this file to track map-specific anchors, star routes, and danger zones.

## Fields to record per map

- Map id or dimensions.
- Opening anchor.
- Backup anchor.
- Star hot spots.
- Common first-contact lanes.
- Grass or hidden-information zones.
- Destructible mound positions.
- Mounds worth clearing.
- Mounds not worth clearing.
- Known losing positions.
- Known winning positions.

## Public map: grass maze

Current notes:
- Center anchor is strong, but holding it forever can lose by runtime when a visible star remains reachable.
- The latest published version improved this by chasing visible stars later in the match.

Questions to test:
- Which star positions should override center control immediately?
- When the enemy is hidden, how long should last-seen lane memory stay active?

