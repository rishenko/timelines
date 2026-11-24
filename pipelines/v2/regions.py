"""Country name -> world region (the pilot's seven regions), to read a place from a Wikipedia category such as
"Earthquakes in Turkey". Names are as Wikipedia writes them in category names; matched whole, longest first."""
R = {
    'Africa': "Algeria, Angola, Benin, Botswana, Burkina Faso, Burundi, Cameroon, Cape Verde, Central African Republic, Chad, Comoros, "
              "Democratic Republic of the Congo, Republic of the Congo, Djibouti, Egypt, Equatorial Guinea, Eritrea, Eswatini, Ethiopia, Gabon, "
              "The Gambia, Ghana, Guinea, Guinea-Bissau, Ivory Coast, Kenya, Lesotho, Liberia, Libya, Madagascar, Malawi, Mali, Mauritania, "
              "Mauritius, Morocco, Mozambique, Namibia, Niger, Nigeria, Rwanda, Senegal, Seychelles, Sierra Leone, Somalia, South Africa, "
              "South Sudan, Sudan, Tanzania, Togo, Tunisia, Uganda, Zambia, Zimbabwe, Western Sahara, Réunion, Sahel, Africa",
    'South Asia': "India, Pakistan, Bangladesh, Nepal, Bhutan, Sri Lanka, Maldives, Afghanistan, Bengal, Kashmir",
    'East Asia': "China, Japan, South Korea, North Korea, Korea, Mongolia, Taiwan, Hong Kong, Macau, Tibet",
    'SE Asia / Oceania': "Indonesia, Philippines, Vietnam, Thailand, Myanmar, Burma, Cambodia, Laos, Malaysia, Singapore, Brunei, East Timor, "
                         "Australia, New Zealand, Papua New Guinea, Fiji, Samoa, Tonga, Vanuatu, Solomon Islands, New Caledonia, Guam, Hawaii, "
                         "Polynesia, Micronesia, Melanesia, Oceania, Southeast Asia",
    'West / Central Asia': "Turkey, Iran, Iraq, Syria, Lebanon, Israel, Palestine, Jordan, Saudi Arabia, Yemen, Oman, United Arab Emirates, Qatar, "
                           "Kuwait, Bahrain, Armenia, Azerbaijan, Georgia (country), Kazakhstan, Uzbekistan, Turkmenistan, Kyrgyzstan, Tajikistan, "
                           "Cyprus, the Middle East, Central Asia",
    'Americas': "United States, Canada, Mexico, Guatemala, Belize, Honduras, El Salvador, Nicaragua, Costa Rica, Panama, Cuba, Haiti, "
                "Dominican Republic, Jamaica, Puerto Rico, Bahamas, Barbados, Trinidad and Tobago, Colombia, Venezuela, Ecuador, Peru, Bolivia, "
                "Chile, Argentina, Paraguay, Uruguay, Brazil, Guyana, Suriname, the Caribbean, Central America, South America, North America, "
                "Alaska, California, Louisiana, Florida, Texas, New York (state), Oklahoma, Missouri, Mississippi, Alabama, Georgia (U.S. state)",
    'Europe / Mediterranean': "United Kingdom, England, Scotland, Wales, Ireland, France, Spain, Portugal, Italy, Germany, the Netherlands, Belgium, "
                              "Luxembourg, Switzerland, Austria, Poland, Czech Republic, Slovakia, Hungary, Romania, Bulgaria, Greece, Albania, "
                              "North Macedonia, Serbia, Croatia, Bosnia and Herzegovina, Slovenia, Montenegro, Kosovo, Moldova, Ukraine, Belarus, "
                              "Russia, Lithuania, Latvia, Estonia, Finland, Sweden, Norway, Denmark, Iceland, Malta, Sicily, Crete, Europe, "
                              "the Soviet Union, the Roman Empire, the Byzantine Empire",
}
LOOKUP = {}
for region, names in R.items():
    for n in names.split(', '):
        LOOKUP[n] = region
NAMES = sorted(LOOKUP, key=len, reverse=True)


def region_of(place):
    """The region of a place name from a category ('Turkey', 'the Netherlands'), or None."""
    p = place.strip()
    return LOOKUP.get(p) or LOOKUP.get('the ' + p) or LOOKUP.get(p[4:] if p.startswith('the ') else '')
