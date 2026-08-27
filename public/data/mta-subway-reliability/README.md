# MTA Subway Mean Distance Between Failures Dataset

## Overview

This dataset contains reliability information for New York City subway cars beginning in 2015. It is published by the Metropolitan Transportation Authority through the New York State Open Data portal.

Mean Distance Between Failures(MDBF) represents the average distance subway cars travel before experiencing a mechanical problem significant enough to cause a service delay.

This dataset can be used to study subway-car reliability over time and compare reliability between different subway car classes.

## Source

Dataset: MTA Subway Mean Distance Between Failures: Beginning 2015

Publisher: Metropolitan Transportation Authority / New York State Open Data

Source:
https://catalog.data.gov/dataset/mta-subway-mean-distance-between-failures-beginning-2015


## Attribute Analysis

| Attribute | Type | Description |
|---|---|---|
| Month | Time | Month and year associated with each reliability measurement. |
| Division | Categorical | MTA subway division, for example as A or B. |
| Car Class | Categorical | Subway car model or fleet class. |
| Total Miles | Quantitative | Total miles traveled by that car class during the month. |
| Number of Failures | Quantitative | Count of mechanical failures during the month. |
| Number of Cars | Quantitative | Number of subway cars in that class. |
| MDBF | Quantitative | Mean Distance Between Failures |
| 12-Month Average MDBF | Quantitative | Rolling 12-month average of Mean Distance Between Failures. |

## Possible Questions

- Which subway car classes are the most reliable?
- Has subway reliability improved over time?
- Which subway car classes have improved the most?
- How much does reliability vary month to month?
- Are newer subway car classes more reliable than older ones?