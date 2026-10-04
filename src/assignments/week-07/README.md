# Week 7: Hospital Quality Brushable Scatterplot Matrix

## Overview

For Week 7, I recreated the interaction pattern from D3's Brushable Scatterplot Matrix example using React, D3, and my CMS hospital quality dataset.

Rather than using the same dataset as the reference implementation, I adapted the technique to my final healthcare project.

The visualization compares four hospital quality variables:

- Overall CMS hospital rating
- Number of mortality measures rated better than the comparison benchmark
- Number of safety measures rated better than the comparison benchmark
- Number of readmission measures rated better than the comparison benchmark

Users can drag a rectangular selection over any scatterplot. Hospitals inside that selection remain highlighted across all of the other scatterplots in the matrix.

This makes it possible to explore whether the same hospitals tend to perform well across multiple quality dimensions and to identify hospitals that may behave differently from the overall pattern.

## Source / Inspiration

D3 Brushable Scatterplot Matrix:

https://observablehq.com/@d3/brushable-scatterplot-matrix

The original D3 example demonstrates linked brushing across multiple scatterplots. Selecting observations in one plot highlights those same observations in every other plot.

I recreated that interaction concept using React and D3 and adapted it to CMS hospital quality data.

## Dataset

CMS Hospital General Information

https://data.cms.gov/provider-data/dataset/xubh-q36u

The same CMS dataset is also used in my Week 6 Hospital Quality Explorer.

## Interaction

- Select a state using the dropdown.
- Drag over any scatterplot to create a selection.
- Hospitals inside the selected region remain highlighted across the entire matrix.
- Unselected hospitals fade into the background.
- A list below the visualization identifies the selected hospitals.
- The Clear Selection button resets the visualization.