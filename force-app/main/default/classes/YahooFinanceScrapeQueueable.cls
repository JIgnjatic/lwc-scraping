public with sharing class YahooFinanceScrapeQueueable implements Queueable, Database.AllowsCallouts{

    private String ticker;
    private String givenDateMiliseconds;
    private String givenDateMilisecondsPlusOneDay;
    private String previousWorkDayMiliseconds;
    private String previousWorkDayMilisecondsPlusOneDay;

    public YahooFinanceScrapeQueueable(String ticker, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay, String previousWorkDayMiliseconds,
                                        String previousWorkDayMilisecondsPlusOneDay) {
        this.ticker = ticker;
        this.givenDateMiliseconds = givenDateMiliseconds;
        this.givenDateMilisecondsPlusOneDay = givenDateMilisecondsPlusOneDay;
        this.previousWorkDayMiliseconds = previousWorkDayMiliseconds;
        this.previousWorkDayMilisecondsPlusOneDay = previousWorkDayMilisecondsPlusOneDay;
    }

    public void execute(QueueableContext context) {
        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = YahooFinanceScrapingHelper.fetchStockData(ticker, givenDateMiliseconds, givenDateMilisecondsPlusOneDay, 
                                                                                                    previousWorkDayMiliseconds, previousWorkDayMilisecondsPlusOneDay);

        YahooFinanceScraping.YahooLWCResponse response = YahooFinanceScrapingHelper.regexScrape(yfw);
        response.ticker = ticker;

        Datetime givenDatetime = Datetime.newInstance(Long.valueOf(this.givenDateMiliseconds) * 1000);
        Date givenDate = Date.newInstance(givenDatetime.year(),givenDatetime.month(),givenDatetime.day()+1);

        System.debug(response);

        Stock_Data__c stockData = YahooFinanceScrapingHelper.parseWrapperToStockData(response,givenDate);
        insert stockData;
    }
}