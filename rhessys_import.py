import pandas as pd
from collections import Counter
import datetime


def ymd_to_day_index(ymd):
    """ Compute day index (i-th day from 1970-01-01) """
    diff = datetime.date(int(ymd[0]), int(ymd[1]), int(
        ymd[2])) - datetime.date(1970, 1, 1)
    return diff.days


def ymd_to_week_index(ymd):
    """ Compute week index (i-th week from 1970-01-01) """
    diff = datetime.date(int(ymd[0]), int(ymd[1]), int(
        ymd[2])) - datetime.date(1970, 1, 1)
    return diff.days // 7


def ymd_to_month_index(ymd):
    """ Compute week month (i-th month from 1970-01-01) """
    month0 = 1970 * 12 + 1
    return ymd[0] * 12 + int(ymd[1]) - month0 + 1


def ymd_to_day_of_year(ymd):
    """ Compute day of year """
    diff = datetime.date(int(ymd[0]), int(ymd[1]), int(
        ymd[2])) - datetime.date(int(ymd[0]), 1, 1)
    return diff.days + 1


def prepare_table_for_mapd(csv_files, delim_whitespace=False):
    """ Load csv files into a pandas dataframe """

    # Load the two files and merge them into one dataframe
    df = None
    for filename in csv_files:
        df1 = pd.read_csv(filename, delim_whitespace=delim_whitespace)
        if df is None:
            df = df1
        else:
            for col in df1.columns:
                if col not in df:
                    df[col] = list(df1[col])

    # Remove unnamed columns if any
    if "Unnamed: 0" in df.columns:
        df = df.drop(columns=["Unnamed: 0"])

    # Remove special characters and deduplicate column names
    ccounter = Counter()

    def name_replacer(x):
        x = "m_" + x.replace(".", "_").replace("%", "percentage_")
        ccounter[x] += 1
        if ccounter[x] == 1:
            return x
        else:
            return x + "_" + str(ccounter[x])
    df.columns = [name_replacer(x) for x in df.columns]

    # Computer additional time variables
    df["t_year"] = df["m_year"]
    df["t_day"] = list(map(ymd_to_day_index, zip(
        df["m_year"], df["m_month"], df["m_day"])))
    df["t_week"] = list(map(ymd_to_week_index, zip(
        df["m_year"], df["m_month"], df["m_day"])))
    df["t_month"] = list(map(ymd_to_month_index, zip(
        df["m_year"], df["m_month"], df["m_day"])))
    # Cyclic time variables
    df["ty_day"] = list(map(ymd_to_day_of_year, zip(
        df["m_year"], df["m_month"], df["m_day"])))
    df["ty_week"] = ((df["ty_day"] - 1) // 7) + 1  # Week of year
    df["ty_month"] = df["m_month"]  # Month of year

    return df
