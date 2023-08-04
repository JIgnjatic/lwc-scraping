public with sharing class YahooFinanceScrapeQueueable implements Queueable{

    private String ticker;
    private String givenDateMiliseconds;
    private String givenDateMilisecondsPlusOneDay;

    public YahooFinanceScrapeQueueable(String ticker, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay) {
        this.ticker = ticker;
        this.givenDateMiliseconds = givenDateMiliseconds;
        this.givenDateMilisecondsPlusOneDay = givenDateMilisecondsPlusOneDay;
    }

    public void execute(QueueableContext context) {
        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = YahooFinanceScrapingHelper.fetchStockData(ticker, givenDateMiliseconds, givenDateMilisecondsPlusOneDay);
        yfw.ticker = ticker;

        YahooFinanceScraping.YahooLWCResponse response = YahooFinanceScrapingHelper.regexScrape(yfw);


        Stock_Data__c stockData = YahooFinanceScrapingHelper.parseWrapperToStockData(response);
        insert stockData;
    }
}