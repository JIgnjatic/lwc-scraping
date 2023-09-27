
<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="images/logo.png" alt="Logo" width="101" height="46">
  </a>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#what-problem-does-it-solve">What problem does it solve</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#what-this-tool-does">What this tool does</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

# Motivation/What problem does it solve

This repository hosts a Salesforce based tool that fetches and scrapes Yahoo historical data, then inserts it into Salesforce. Why not use an Yahoo Finance API? Well, the new version of Yahoo Finanance API has limitations where it doesn't allow us to fetch the data in a streamlined way, hence, a lot of the solutions that can be fined throughout the internet utilise scraping methods. For more info see: https://www.marketdata.app/how-to-use-the-yahoo-finance-api/


## Installation

To deploy changes to your org, you would need to right click on the source folder then SFDX:Deploy source to org

![image](https://github.com/JIgnjatic/lwc-scraping/assets/81022305/18b4a95f-4054-4fe8-9815-8eb77d350733)


## What this tool does

It fetches HTML data from Yahoo Finance in order to scrape it for necessary information and store it on Salesforce. We accomplish this in 3 approaches:

1.LWC JS scrape (synchronous) 
2.Queueable Apex Scrape (Async)
3.Schedulable Apex Scrape (Async)


### LWC Scrape

LWC scrape is a fast non-scalable approach to quickly scrape the necessary date and have it represented via a lightning-datatable. 
In this approach we use the list-box component to place all of the ticker values inside it for the user to select. 

![image](https://github.com/JIgnjatic/yahoo-lwc-scraping/assets/81022305/0a04abfe-b146-4101-a29c-55373538e879)




# Built With


* [![Apex][Apex]][Apex-url]







[Apex]: https://avatars.githubusercontent.com/u/453694?s=200&v=4
[Apex-url]: https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_intro_what_is_apex.html









**Old Description**

**Update 11.08.2023.**
**Async addition**

The repo also now includes a queueable class where we can scrape the data via regex. The regex and scraping is performed inside the YahooFinanceScrapingHelper.

Previous Close Price is also now included when scraping the price via regex.

**Technologies**

Since this tool is hosted on Salesforce, we utilise front-end framework LWC with back-end Apex. 

**Apex Responsibilities**

Apex has an _AuraEnabled_ method that accepts ticker and a given date. Then it generates 3 URLs to retreive the data from:
- historical data link (example: https://finance.yahoo.com/quote/AAPL/history?period1=1656842710&period2=1688378710&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true)
- company data (example: https://finance.yahoo.com/quote/AAPL/profile?p=AAPL)
- market cap (example: https://finance.yahoo.com/quote/AAPL?p=AAPL)

After making a callout to these links, we place that data into a wrapper object named _YahooFinanceHTMLWrapper_, which we send back to LWC.

Other functionalities are duplication verification prior to making the callout.


**Dashboard**

We can also generate reports and dashboards from the scraped data such as:

<img width="964" alt="image" src="https://github.com/JIgnjatic/yahoo-lwc-scraping/assets/81022305/018898c1-3508-4a36-9be3-72af1acdb3c5">



**LWC Responsibilities**

It fetches a list of tickers via a list-box. After sending a list of tickers and then receiving HTML from Apex, we scrape the HTML in order to retrieve the following data:
- Open Price
- Close Price
- Market Cap
- Industry
- Number of employees
- Company Address

LWC also prevents the user selecting either a weekend or a US holiday.

After scraping the data, we send a list to Apex to insert the data and then represent the inserted data via a lightning-datatable.
