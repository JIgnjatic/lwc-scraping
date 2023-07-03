**Yahoo Finance LWC Scraping**

This repository hosts a Salesforce based tool that fetches and scrapes Yahoo historical data, then inserts it into Salesforce. Why not use an Yahoo Finance API? Well, the new version of Yahoo Finanance API has limitations where it doesn't allow us to fetch the data in a streamlined way, hence, a lot of the solutions that can be fined throughout the internet utilise scraping methods. For more info see: https://www.marketdata.app/how-to-use-the-yahoo-finance-api/

**Techonologies**

Since this tool is hosted, we utilise front-end framework: LWC with Apex. 

**Apex Responsibilities**

Apex has an _AuraEnabled_ method that accepts ticker and a given date. Then it generates 3 URLs to retreive the data from:
- historical data link (example: https://finance.yahoo.com/quote/AAPL/history?period1=1656842710&period2=1688378710&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true)
- company data (example: https://finance.yahoo.com/quote/AAPL/profile?p=AAPL)
- market cap (example: https://finance.yahoo.com/quote/AAPL?p=AAPL)

After making a callout to these links, we place that data into a wrapper object named _YahooFinanceHTMLWrapper_, which we send back to LWC.

Other functionalities are duplication verification prior to making the callout.

**LWC Responsibilities**

It fetches a list of tickers via a list-box. After sending a list of tickers and then receiving HTML from Apex, we scrape the HTML in order to retrieve the following data:
- Open Price
- Close Price
- Market Cap
- Industry
- Number of employees
- Company Address

LWC also prevents the user selecting either a weekend or a US holiday.
