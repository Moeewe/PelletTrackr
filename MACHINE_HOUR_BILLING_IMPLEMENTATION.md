# Machine Hour Billing Implementation

## Overview
This document describes the implementation of machine hour billing functionality in the PelletTrackr system. The new feature allows users to bill for machine hours when using their own materials, and admins can set hourly rates for each printer.

## New Features Added

### 1. Printer Management Enhancements
- **Price per Hour Field**: Added to printer forms in admin interface
- **Database Storage**: New `pricePerHour` field in printers collection
- **UI Display**: Shows hourly rate in printer management cards

### 2. Enhanced Print Job Form
- **Printer Selection**: Dropdown with all available printers
- **Time Input**: Minutes field for print duration
- **Own Material Checkbox**: Toggle for using own materials
- **Dynamic Cost Calculation**: Real-time cost preview updates

### 3. Updated Entry Data Structure
New fields added to entries collection:
- `printer`: Selected printer name
- `printTime`: Print duration in minutes
- `printerPricePerHour`: Hourly rate at time of entry
- `printerCost`: Calculated printer cost
- `ownMaterialUsed`: Boolean flag for own material usage

### 4. Cost Calculation Logic
- **Own Material Mode**: Only charges printer costs (time × hourly rate)
- **Standard Mode**: Charges material costs + optional printer costs
- **Real-time Updates**: Cost preview updates as form values change

### 5. Enhanced Entry Display
- **Tables**: Added printer and time columns
- **Cards**: Shows printer and time information
- **Admin View**: Displays all new fields in admin tables

## Technical Implementation

### Files Modified

#### 1. Printer Management (`js/features/assets/printer-management.js`)
- Added `pricePerHour` field to printer forms
- Updated save/load functions to handle new field
- Enhanced printer display to show hourly rates

#### 2. Entry Management (`js/features/entries/entry-management.js`)
- Updated `addEntry()` function to handle new fields
- Enhanced validation logic for printer time requirements
- Modified cost calculation to include machine hours
- Updated `clearForm()` to reset new fields

#### 3. Entry Rendering (`js/features/entries/entry-rendering.js`)
- Added printer and time columns to tables
- Enhanced mobile cards to display new information
- Updated both user and admin entry displays

#### 4. Material Loading (`js/features/materials/material-loading.js`)
- Added `loadPrinters()` function
- Created `loadAllFormData()` for unified data loading
- Implemented `setupFormEventListeners()` for real-time updates
- Added event listeners for all form fields

#### 5. Navigation (`js/core/navigation.js`)
- Updated `initializeUserDashboard()` to use new loading function
- Added fallback support for older versions

#### 6. HTML Form (`index.html`)
- Added printer selection dropdown
- Added time input field
- Added "Own Material Used" checkbox
- Positioned new fields between job name and material sections

### Database Schema Changes

#### Printers Collection
```javascript
{
  // ... existing fields ...
  pricePerHour: number, // New field for hourly rate
  // ... existing fields ...
}
```

#### Entries Collection
```javascript
{
  // ... existing fields ...
  printer: string,           // Selected printer name
  printTime: number,         // Print duration in minutes
  printerPricePerHour: number, // Hourly rate at entry time
  printerCost: number,       // Calculated printer cost
  ownMaterialUsed: boolean,  // Own material flag
  // ... existing fields ...
}
```

## User Workflow

### For Regular Users
1. **Select Printer**: Choose from available printers (shows hourly rate)
2. **Enter Time**: Specify print duration in minutes
3. **Choose Materials**: Select materials and quantities (optional)
4. **Toggle Own Material**: Check if using own materials
5. **Review Costs**: See real-time cost calculation
6. **Submit**: Entry saved with all new information

### For Admins
1. **Set Hourly Rates**: Configure price per hour for each printer
2. **Manage Printers**: Add/edit printers with hourly rates
3. **View Entries**: See printer and time information in all views
4. **Track Costs**: Monitor machine hour vs material costs

## Cost Calculation Examples

### Example 1: Own Material Used
- Printer: Ginger Additive (18€/h)
- Time: 120 minutes (2 hours)
- Cost: 2 × 18€ = 36€

### Example 2: Standard Material Usage
- Material: PLA (25€/kg)
- Quantity: 0.5kg
- Printer: Ginger Additive (18€/h)
- Time: 60 minutes (1 hour)
- Cost: (0.5 × 25€) + (1 × 18€) = 12.50€ + 18€ = 30.50€

## Validation Rules

1. **Minimum Requirements**: Must have either materials or printer time
2. **Own Material**: Requires printer time when own material is used
3. **Time Validation**: Print time must be positive number
4. **Printer Selection**: Must select valid printer when time is entered

## Backward Compatibility

- Existing entries without new fields continue to work
- Fallback loading functions for older versions
- Graceful handling of missing printer data
- Default values for new fields in existing entries

## Testing Checklist

- [ ] Printer management with hourly rates
- [ ] Form validation for new fields
- [ ] Cost calculation accuracy
- [ ] Real-time cost preview updates
- [ ] Entry display in tables and cards
- [ ] Admin interface functionality
- [ ] Database storage and retrieval
- [ ] Backward compatibility with existing data

## Future Enhancements

1. **Bulk Operations**: Set hourly rates for multiple printers
2. **Time Tracking**: Automatic time tracking during prints
3. **Usage Analytics**: Reports on machine hour utilization
4. **Rate History**: Track rate changes over time
5. **Advanced Billing**: Different rates for different time periods

## Deployment Notes

1. **Database Migration**: No migration required, new fields are optional
2. **Feature Flags**: Can be enabled/disabled via configuration
3. **User Training**: Admin training for setting hourly rates
4. **Documentation**: Update user guides with new workflow 