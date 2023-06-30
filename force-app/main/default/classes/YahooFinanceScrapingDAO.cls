public with sharing class YahooFinanceScrapingDAO {
   
    public static List<Stock_Data__c> findScrapedData(List<String> tickers, Date givenDate){

        return [SELECT ID,Ticker_Symbol__c 
                FROM Stock_Data__c 
                WHERE Ticker_Symbol__c IN :tickers];
    }
}