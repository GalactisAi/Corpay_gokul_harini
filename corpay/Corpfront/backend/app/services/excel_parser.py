import math
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path


def _safe_float(value: Any) -> Optional[float]:
    """Convert to float; return None if NaN, Inf, or invalid."""
    if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
        return None
    try:
        f = float(value)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


class ExcelParser:
    """Service for parsing Excel files and extracting dashboard data"""
    
    @staticmethod
    def parse_revenue_file(file_path: str) -> Dict[str, Any]:
        """
        Parse revenue Excel file
        Expected format:
        - Sheet 1: Total revenue with percentage change
        - Sheet 2: Monthly revenue trends
        - Sheet 3: Revenue proportions (Fleet, Corporate, Lodging)
        """
        try:
            excel_file = pd.ExcelFile(file_path)
            result = {
                "total_revenue": None,
                "percentage_change": None,
                "revenue_trends": [],
                "revenue_proportions": []
            }
            
            # Parse total revenue (first sheet or specific sheet)
            if len(excel_file.sheet_names) > 0:
                df_total = pd.read_excel(file_path, sheet_name=0)
                # Look for total revenue and percentage change
                # Flexible parsing - look for common column names
                if 'Total Revenue' in df_total.columns or 'total_revenue' in df_total.columns:
                    col = 'Total Revenue' if 'Total Revenue' in df_total.columns else 'total_revenue'
                    result["total_revenue"] = _safe_float(df_total[col].iloc[0])
                elif len(df_total) > 0:
                    for col in df_total.columns:
                        if pd.api.types.is_numeric_dtype(df_total[col]):
                            result["total_revenue"] = _safe_float(df_total[col].iloc[0])
                            break
                
                if 'Percentage Change' in df_total.columns or 'percentage_change' in df_total.columns:
                    col = 'Percentage Change' if 'Percentage Change' in df_total.columns else 'percentage_change'
                    result["percentage_change"] = _safe_float(df_total[col].iloc[0])
            
            # Ensure we never return numpy/pandas nan to API (DB NOT NULL constraint)
            if result["total_revenue"] is not None:
                result["total_revenue"] = float(result["total_revenue"])
                if math.isnan(result["total_revenue"]) or math.isinf(result["total_revenue"]):
                    result["total_revenue"] = None
            if result["percentage_change"] is not None:
                result["percentage_change"] = float(result["percentage_change"])
                if math.isnan(result["percentage_change"]) or math.isinf(result["percentage_change"]):
                    result["percentage_change"] = None
            
            # Parse revenue trends (second sheet or 'Trends' sheet)
            trends_sheet = None
            for sheet in excel_file.sheet_names:
                if 'trend' in sheet.lower() or 'trends' in sheet.lower():
                    trends_sheet = sheet
                    break
            
            if trends_sheet:
                df_trends = pd.read_excel(file_path, sheet_name=trends_sheet)

                # Normalize and collect trends; we'll later sort them
                # in calendar order (Jan–Dec) when serving from the API.
                for _, row in df_trends.iterrows():
                    raw_month = str(row.get('Month', row.get('month', ''))).strip()
                    if not raw_month:
                        continue

                    # Normalize Excel month values to 3‑letter title‑case
                    # so "January", "jan", "JAN" -> "Jan", etc.
                    normalized_month = raw_month[:3].title()

                    value = float(row.get('Value', row.get('value', 0)))
                    highlight = bool(row.get('Highlight', row.get('highlight', False)))
                    result["revenue_trends"].append({
                        "month": normalized_month,
                        "value": value,
                        "highlight": highlight
                    })
            
            # Parse revenue proportions (third sheet or 'Proportions' sheet)
            proportions_sheet = None
            for sheet in excel_file.sheet_names:
                if 'proportion' in sheet.lower() or 'category' in sheet.lower():
                    proportions_sheet = sheet
                    break
            
            if proportions_sheet:
                df_props = pd.read_excel(file_path, sheet_name=proportions_sheet)
                # Default colors
                colors = {
                    "Fleet": "#981239",
                    "Corporate": "#3D1628",
                    "Lodging": "#E6E8E7"
                }
                
                for _, row in df_props.iterrows():
                    category = str(row.get('Category', row.get('category', '')))
                    percentage = float(row.get('Percentage', row.get('percentage', 0)))
                    color = colors.get(category, "#981239")
                    result["revenue_proportions"].append({
                        "category": category,
                        "percentage": percentage,
                        "color": color
                    })
            
            return result
        except Exception as e:
            raise ValueError(f"Error parsing revenue file: {str(e)}")
    
    @staticmethod
    def parse_payments_file(file_path: str) -> Dict[str, Any]:
        """
        Parse payments Excel file
        Expected columns: Date, Amount Processed, Transaction Count
        """
        try:
            df = pd.read_excel(file_path)
            
            # Find today's data or latest data
            result = {
                "amount_processed": 0.0,
                "transaction_count": 0,
                "date": datetime.now().date()
            }
            
            # Look for date column
            date_col = None
            for col in df.columns:
                if 'date' in col.lower() or 'Date' in col:
                    date_col = col
                    break
            
            # Look for amount and transaction columns
            amount_col = None
            trans_col = None
            for col in df.columns:
                col_lower = col.lower()
                if 'amount' in col_lower or 'processed' in col_lower:
                    amount_col = col
                if 'transaction' in col_lower or 'count' in col_lower:
                    trans_col = col
            
            if date_col:
                # Get latest row
                df[date_col] = pd.to_datetime(df[date_col])
                latest_row = df.loc[df[date_col].idxmax()]
                result["date"] = latest_row[date_col].date()
            else:
                # Use last row
                latest_row = df.iloc[-1]
            
            if amount_col:
                result["amount_processed"] = float(latest_row[amount_col])
            elif len(df.columns) > 0:
                # Try first numeric column
                for col in df.columns:
                    if pd.api.types.is_numeric_dtype(df[col]):
                        result["amount_processed"] = float(latest_row[col])
                        break
            
            if trans_col:
                result["transaction_count"] = int(latest_row[trans_col])
            elif len(df.columns) > 1:
                # Try second numeric column
                numeric_cols = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
                if len(numeric_cols) > 1:
                    result["transaction_count"] = int(latest_row[numeric_cols[1]])
            
            return result
        except Exception as e:
            raise ValueError(f"Error parsing payments file: {str(e)}")
    
    @staticmethod
    def parse_system_performance_file(file_path: str) -> Dict[str, Any]:
        """
        Parse system performance Excel file
        Expected columns: Uptime Percentage, Success Rate
        """
        try:
            df = pd.read_excel(file_path)
            
            result = {
                "uptime_percentage": 0.0,
                "success_rate": 0.0
            }
            
            # Look for uptime and success rate columns
            uptime_col = None
            success_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'uptime' in col_lower:
                    uptime_col = col
                if 'success' in col_lower or 'rate' in col_lower:
                    success_col = col
            
            # Get latest row
            latest_row = df.iloc[-1]
            
            if uptime_col:
                result["uptime_percentage"] = float(latest_row[uptime_col])
            elif len(df.columns) > 0:
                # First numeric column
                for col in df.columns:
                    if pd.api.types.is_numeric_dtype(df[col]):
                        result["uptime_percentage"] = float(latest_row[col])
                        break
            
            if success_col:
                result["success_rate"] = float(latest_row[success_col])
            elif len(df.columns) > 1:
                # Second numeric column
                numeric_cols = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
                if len(numeric_cols) > 1:
                    result["success_rate"] = float(latest_row[numeric_cols[1]])
            
            return result
        except Exception as e:
            raise ValueError(f"Error parsing system performance file: {str(e)}")
    
    @staticmethod
    def parse_employee_file(file_path: str) -> List[Dict[str, Any]]:
        """
        Parse employee data Excel file
        Expected columns: Name, Description, Department, Milestone Type, Date
        """
        try:
            df = pd.read_excel(file_path)
            employees = []
            
            # Default colors by milestone type
            color_map = {
                "anniversary": {"border": "#981239", "background": "#fef5f8"},
                "birthday": {"border": "#BE1549", "background": "#fff5f9"},
                "promotion": {"border": "#981239", "background": "#fef5f8"},
                "new_hire": {"border": "#0085C2", "background": "#f0f9fd"},
            }
            
            for _, row in df.iterrows():
                name = str(row.get('Name', row.get('name', '')))
                description = str(row.get('Description', row.get('description', '')))
                milestone_type = str(row.get('Milestone Type', row.get('milestone_type', 'anniversary'))).lower()
                department = str(row.get('Department', row.get('department', '')))
                
                # Parse date
                date_col = None
                for col in df.columns:
                    if 'date' in col.lower():
                        date_col = col
                        break
                
                milestone_date = datetime.now()
                if date_col:
                    milestone_date = pd.to_datetime(row[date_col])
                
                colors = color_map.get(milestone_type, {"border": "#981239", "background": "#fef5f8"})
                
                employees.append({
                    "name": name,
                    "description": description,
                    "milestone_type": milestone_type,
                    "department": department if department else None,
                    "milestone_date": milestone_date,
                    "border_color": colors["border"],
                    "background_color": colors["background"]
                })
            
            return employees
        except Exception as e:
            raise ValueError(f"Error parsing employee file: {str(e)}")

