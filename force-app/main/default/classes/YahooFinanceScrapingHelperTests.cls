@isTest
public with sharing class YahooFinanceScrapingHelperTests {
   
    @isTest
    static void testFetchStockData(){

        String ticker = 'AAPL';

        String givenDateMiliseconds = getTimeInMiliseconds(22, 06, 2023);
        String givenDatePlusOneDayMiliseconds = getTimeInMiliseconds(22, 06, 2023);

        Test.startTest();

        Test.setMock(HttpCalloutMock.class, new YahooFinanceScrapingMock());

        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = YahooFinanceScrapingHelper.fetchStockData(ticker,givenDateMiliseconds,givenDatePlusOneDayMiliseconds);

        Test.stopTest();

        String expectedValue = '<html></html>';

        System.assertEquals(expectedValue, yfw.stockData);
        System.assertEquals(expectedValue, yfw.companyInfo);
        System.assertEquals(expectedValue, yfw.marketCap);

    }

    @isTest
    static void testMakeCalloutSuccess(){

        String ticker = 'AAPL';

        String givenDateMiliseconds = getTimeInMiliseconds(22, 06, 2023);
        String givenDatePlusOneDayMiliseconds = getTimeInMiliseconds(22, 06, 2023);

        String url = 'https://finance.yahoo.com/quote/' + ticker + '/history?period1=';

        Test.startTest();

        Test.setMock(HttpCalloutMock.class, new YahooFinanceScrapingMock());

        HttpResponse response = YahooFinanceScrapingHelper.makeCallout(url);

        Test.stopTest();

        String expectedValue = '<html></html>';
        Integer successStatusCode = 200;

        System.debug(response);

        System.assertEquals(successStatusCode, response.getStatusCode());
        System.assertEquals(expectedValue, response.getBody());
    }

    @isTest
    static void testMakeCalloutFail(){

        String ticker = 'AAPL';

        String givenDateMiliseconds = getTimeInMiliseconds(22, 06, 2023);
        String givenDatePlusOneDayMiliseconds = getTimeInMiliseconds(22, 06, 2023);

        String badUrl = 'https://finance.yahoo.com/quote/' + ticker + '/histtory?period1=';

        Test.startTest();

        Test.setMock(HttpCalloutMock.class, new YahooFinanceScrapingMock());

        HttpResponse response = YahooFinanceScrapingHelper.makeCallout(badUrl);

        Test.stopTest();

        Integer failStatusCode = 400;

        System.assertEquals(failStatusCode, response.getStatusCode());
    }


    static String getTimeInMiliseconds(Integer day, Integer month, Integer year){

        DateTime givenDate = DateTime.newInstance(year, month, day);
        Long givenDateMilisecondsLong = givenDate.getTime();

        return String.valueOf(givenDateMilisecondsLong);
    }

}