public with sharing class YahooFinanceScrapingHelper {
    
    public static YahooFinanceScraping.YahooFinanceHTMLWrapper fetchStockData(String ticker, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay,
                                                                            String previousWorkDayMiliseconds, String previousWorkDayMilisecondsPlusOneDay) {
        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = new YahooFinanceScraping.YahooFinanceHTMLWrapper();
        String stockUrl = 'https://finance.yahoo.com/quote/' + ticker + '/history?period1=' + givenDateMiliseconds + '&period2=' + givenDateMilisecondsPlusOneDay + '&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';
        String previousCloseDayUrl = 'https://finance.yahoo.com/quote/' + ticker + '/history?period1=' + previousWorkDayMiliseconds + '&period2=' + previousWorkDayMilisecondsPlusOneDay + '&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';                                                                         
        String companyUrl = 'https://finance.yahoo.com/quote/' + ticker + '/profile?p=' + ticker;
        String marketCapUrl = 'https://finance.yahoo.com/quote/' + ticker + '?p=' + ticker;
    
        List<String> urls = new List<String>{stockUrl, previousCloseDayUrl, companyUrl, marketCapUrl};
    
        for (String url : urls) {
            HttpResponse response = makeCallout(url);
            if (response.getStatusCode() == 200) {
                if (url == stockUrl) {
                    yfw.stockData = response.getBody();
                }else if(url == previousCloseDayUrl){
                    yfw.previousCloseDayStock = response.getBody();
                } else if (url == companyUrl) {
                    yfw.companyInfo = response.getBody();
                } else if (url == marketCapUrl) {
                    yfw.marketCap = response.getBody();
                }
            }
        }
    
        return yfw;
    }

    @testVisible
    public static HttpResponse makeCallout(String url) {
        HttpRequest request = new HttpRequest();
        Http http = new Http();
        request.setEndpoint(url);
        request.setMethod('GET');
        HttpResponse response;

        try {
            response = http.send(request);
            if (response.getStatusCode() != 200) {
                throw new CalloutException('Callout unsuccessful. Status: '+response.getStatus() + ' Status Code: '+response.getStatusCode());
            }
        } catch (Exception e) {
            throw new CalloutException('Failed to retrieve HTML. Error: ' + e.getMessage());
        }

        return response;
    }


    public static YahooFinanceScraping.YahooLWCResponse regexScrape(YahooFinanceScraping.YahooFinanceHTMLWrapper yfw){

        String stockDataRegex = '<span>(\\d+\\.\\d+)</span>';
        String marketCapRegex = '(?<=data-test="MARKET_CAP-value">)([0-9.]+)[TMB]?';
        String addressRegex = '<p class="D\\(ib\\) W\\(47\\.727%\\) Pend\\(40px\\)">(.*?)<br/>(.*?)<br/>(.*?)<br/>(.*?)<br/>';
        String yearFoundedRegexOption1 = '(?<= founded in) \\d{4}'; 
        String yearFoundedRegexOption2 = '(?<= incorporated in) \\d{4}'; 
        String numOfEmployeesRegex = '<span>(\\d+),(\\d+)</span>';
        String fullNameRegex = '<h1 class="D\\(ib\\) Fz\\(18px\\)">(.*?) (.*?) ';
        String industryRegex = '<span class="Fw\\(600\\)">([^<]+)<\\/span>';

        YahooFinanceScraping.YahooLWCResponse responseWrapper = new YahooFinanceScraping.YahooLWCResponse();
        
        responseWrapper.openPrice = extractDataViaRegexMultipleMatchers(yfw.stockData, stockDataRegex, 0);
        responseWrapper.closePrice = extractDataViaRegexMultipleMatchers(yfw.stockData, stockDataRegex, 3);
        responseWrapper.previousClosePrice = extractDataViaRegexMultipleMatchers(yfw.previousCloseDayStock, stockDataRegex, 3);

        responseWrapper.companyAddress = extractDataViaRegexOneMatcher(yfw.companyInfo, addressRegex, new List<Integer>{1,2,3,4}, true);
        responseWrapper.employeeNumber = extractDataViaRegexOneMatcher(yfw.companyInfo, numOfEmployeesRegex, new List<Integer>{1,2}, false);
        responseWrapper.name = extractDataViaRegexOneMatcher(yfw.companyInfo, fullNameRegex, new List<Integer>{1,2}, false);
        responseWrapper.marketCap = extractDataViaRegexOneMatcher(yfw.marketCap, marketCapRegex, new List<Integer>{0}, false);
        responseWrapper.industry = extractDataViaRegexOneMatcher(yfw.companyInfo, industryRegex, new List<Integer>{1}, false);

        String yearFoundedRes1 = extractDataViaRegexOneMatcher(yfw.companyInfo, yearFoundedRegexOption1, new List<Integer>{0}, false);
        String yearFoundedRes2 = extractDataViaRegexOneMatcher(yfw.companyInfo, yearFoundedRegexOption2, new List<Integer>{0}, false);

        String yearFounded = yearFoundedRes1 != '' ? yearFoundedRes1 : yearFoundedRes2;        
        responseWrapper.yearFounded = yearFounded;

        return responseWrapper;
    }

    private static String extractDataViaRegexOneMatcher(String data, String regex, List<Integer> groupNumbers, Boolean isAddress){

        //shortening the html to be able to perform regex operations (avoiding the 'regex too complicated' error)
        data = data.substring(0, data.length() - 800000);

        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(data);
        matcher.find();
        String value = '';

        try {
            for (Integer i = 0; i <= groupNumbers.size(); i++) {
                System.debug(i);

                String extractedValue = matcher.group(i);
                System.debug('Extracted value: ' + extractedValue);

                if (groupNumbers.contains(i)) {
                    value += extractedValue;
                    value += isAddress ? ', ' : ' ';
                }
            }

            //removing the last comma
            value = value.removeEnd(', ');

        } catch (StringException e) {
            System.debug(e.getMessage());
            return value;
        }

        return value;
    }

    private static String extractDataViaRegexMultipleMatchers(String data, String regex, Integer matcherNumber){

        data = data.substring(0, data.length() - 800000);

        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(data);
        String extractedValue = '';
        Integer i=0;
     
        while (matcher.find()) {
            System.debug(i);

            extractedValue = matcher.group(1);
            System.debug('Extracted value: ' + extractedValue);
            
            if(i == matcherNumber){
                return extractedValue;
            }
            i=++i;

        }

        return null;                                                     
    }

    public static Stock_Data__c parseWrapperToStockData(YahooFinanceScraping.YahooLWCResponse ywr, Date givenDate){

        Stock_Data__c sd = new Stock_Data__c();
        sd.Ticker_Symbol__c = ywr.ticker;
        sd.Date__c =  ywr.givenDate != null ? Date.valueOf(ywr.givenDate) : givenDate;
        sd.Name = ywr.ticker + ' ' + givenDate.format();
        sd.Open_Price__c = Decimal.valueOf(ywr.openPrice);
        sd.Close_Price__c = Decimal.valueOf(ywr.closePrice);
        sd.Market_Cap__c = String.valueOf(ywr.marketCap);
        sd.Employee_Number__c = ywr.employeeNumber;
        sd.Company_Address__c = ywr.companyAddress;
        sd.Industry__c = ywr.industry;
        sd.Year_Founded__c = ywr.yearFounded;

        return sd;
    }

}