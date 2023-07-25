@isTest
public with sharing class YahooFinanceScrapingTests {
   

    @TestSetup
    static void makeData(){

        Stock_Data__c sd = new Stock_Data__c();

        sd.Name = 'AAPL 2023-06-22';
        sd.Ticker_Symbol__c = 'AAPL';
        sd.Date__c = Date.newInstance(2023, 06, 22);

        insert sd;
    }

    @isTest
    static void testScrapeHTML(){

        String ticker = 'AAPL';

        String givenDateMiliseconds = getTimeInMiliseconds(22, 06, 2023);
        String givenDatePlusOneDayMiliseconds = getTimeInMiliseconds(22, 06, 2023);

        Test.startTest();

        Test.setMock(HttpCalloutMock.class, new YahooFinanceScrapingMock());

        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = YahooFinanceScraping.scrapeHTML(ticker,givenDateMiliseconds,givenDatePlusOneDayMiliseconds);

        Test.stopTest();

        String expectedValue = '<html></html>';

        System.assertEquals(yfw.ticker, ticker);
        System.assertEquals(expectedValue, yfw.stockData);
        System.assertEquals(expectedValue, yfw.companyInfo);
        System.assertEquals(expectedValue, yfw.marketCap);
    }

    @isTest
    static void testVerifyDuplicates(){
        String ticker = 'AAPL';

        List<Stock_Data__c> duplicateTickers = YahooFinanceScraping.verifyDuplicates(new List<String>{ticker}, '2023-06-22');

        System.assertEquals(1, duplicateTickers.size());
    }

    @isTest
    static void testAddInsertResultsToWrapper(){

        Stock_Data__c data = new Stock_Data__c();

        data.Ticker_Symbol__c = 'AAPL';
        data.Open_Price__c = 1;
        data.Close_Price__c = 1;
        data.Date__c = Date.today();
        
        List<Database.SaveResult> results = Database.insert(new List<Stock_Data__c>{data});


        YahooFinanceScraping.YahooLWCResponse response = new YahooFinanceScraping.YahooLWCResponse();
        response.ticker = 'AAPL';

        List<YahooFinanceScraping.YahooLWCResponse> responses = new List<YahooFinanceScraping.YahooLWCResponse>{response};
        
        List<YahooFinanceScraping.YahooLWCResponse> returnList = YahooFinanceScraping.addInsertResultsToWrapper(results, responses);

        System.assertEquals(1, returnList.size(),'returnList should have 1 member');
        YahooFinanceScraping.YahooLWCResponse returnResponse = returnList[0];

        System.assertEquals(true, returnResponse.success);

    }
    
    static String getTimeInMiliseconds(Integer day, Integer month, Integer year){

        DateTime givenDate = DateTime.newInstance(year, month, day);
        Long givenDateMilisecondsLong = givenDate.getTime();

        return String.valueOf(givenDateMilisecondsLong);
    }

}