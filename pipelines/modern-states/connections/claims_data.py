# Hand claims for build_claims.py (exec'd there; helpers ent/span/mem/ev/gap/alias come from it).
# Every quote is checked verbatim against the cached page (plain text, or wikitext with markup stripped).
# Years only; the day, when the source gives one, goes in `date`.

# ---------------------------------------------------------------- name -> row aliases (Modern States, main 77c8375)
alias("UK", "united-kingdom")
alias("Kingdom of Iraq", "iraq", "Kingdom of Iraq")
alias("Pahlavi dynasty", "iran", "Pahlavi Iran")
alias("Iran", "iran", "Pahlavi Iran", before=1979)
alias("People's Socialist Republic of Albania", "albania", "People's Socialist Republic")
alias("Albania", "albania", "People's Socialist Republic", before=1991)
alias("People's Republic of Bulgaria", "bulgaria", "People's Republic of Bulgaria")
alias("Czechoslovak Socialist Republic", "czechoslovakia", "Czechoslovakia (restored)")
alias("Czechoslovakia", "czechoslovakia", "Czechoslovakia (restored)")
alias("East Germany", "germany", "East Germany")
alias("Germany", "germany", "West Germany", before=1990)
alias("Hungarian People's Republic", "hungary", None)
alias("Socialist Republic of Romania", "romania", "Socialist Republic of Romania")
alias("Mongolian People's Republic", "mongolia", "Mongolian People's Republic")
alias("Republic of Cuba", "cuba", "Revolutionary Cuba")
alias("Cuba", "cuba", "Revolutionary Cuba", before=2100)
alias("Socialist Republic of Vietnam", "vietnam", "Socialist Republic of Vietnam")
alias("North Vietnam", "vietnam", "Democratic Republic of Vietnam")
alias("South Vietnam", "vietnam", "Republic of Vietnam")
alias("North Yemen", "yemen", "Kingdom of Yemen (North)", before=1962)
alias("North Yemen", "yemen", "Yemen Arab Republic (North)")
alias("South Yemen", "yemen", "People's Democratic Republic of Yemen (South)")
alias("Czech Republic", "czechia", "Czech Republic")
alias("Republic of the Congo", "republic-of-the-congo")
alias("Democratic Republic of the Congo", "dr-congo", "Republic of the Congo (Léopoldville)", before=1964)
alias("Palestine", "palestine")
alias("East Timor", "timor-leste")
alias("Algeria", "algeria", "Provisional Government of the Algerian Republic", before=1962)
alias("Polish People's Republic", "poland", "Polish People's Republic")

# ---------------------------------------------------------------- Cold War blocs (union rows: memberOf on members)
ent("nato", "NATO", "union", ["NATO", "Member states of NATO"])
span("nato", "start", 1949, "4 April 1949", infobox=("NATO", "formation"))
span("nato", "ongoing", None, None, quote="The North Atlantic Treaty Organization (NATO) is an intergovernmental military alliance between 32 member states", page="NATO", optional=True)
# NATO memberships come from the Member states of NATO table (parse_nato in build_claims.py). In enwiki-20261101 the
# table has no accession cell for these rows, so they are cited from prose on the NATO page instead:
NATO_FOUND = "The 12 founding members of the alliance were Belgium, Canada, Denmark, France, Iceland, Italy, Luxembourg, the Netherlands, Norway, Portugal, the United Kingdom, and the United States."
NATO_2004 = "Bulgaria, Estonia, Latvia, Lithuania, Romania, Slovakia, and Slovenia in 2004"
NATO_FALLBACK = {"Italy": (1949, NATO_FOUND), "United States": (1949, NATO_FOUND), "Lithuania": (2004, NATO_2004),
                 "Slovakia": (2004, NATO_2004), "Slovenia": (2004, NATO_2004)}

ent("warsaw-pact", "Warsaw Pact", "union", ["Warsaw Pact"])
span("warsaw-pact", "start", 1955, "14 May 1955", infobox=("Warsaw Pact", "established_date1"))
span("warsaw-pact", "end", 1991, "25 February 1991 (disbanded); treaty disestablished 1 July 1991",
     quote="On 25 February 1991, the Warsaw Pact was declared disbanded at a meeting of defence and foreign ministers from remaining Pact countries meeting in Hungary.", page="Warsaw Pact")
WP_FOUND = "On 14 May 1955, the USSR and seven other Eastern European countries"
for m in ["People's Republic of Bulgaria", "Czechoslovak Socialist Republic", "Hungarian People's Republic",
          "Polish People's Republic", "Socialist Republic of Romania", "Soviet Union"]:
    mem("warsaw-pact", m, 1955, 1991, WP_FOUND, "Warsaw Pact", toQuote="On 25 February 1991, at a meeting in Hungary, the pact ceased to exist via joint declaration by the defence and foreign ministers of the six remaining member states.")
mem("warsaw-pact", "People's Socialist Republic of Albania", 1955, 1968, WP_FOUND, "Warsaw Pact",
    toQuote="Albania withheld its support to the Warsaw Pact in 1961 due to the Soviet–Albanian split and formally withdrew in 1968.",
    note="De facto out from 1961; formal withdrawal 1968. Option: end 1961 with a 1961–1968 'withheld support' phase-like note.")
mem("warsaw-pact", "East Germany", 1955, 1990, WP_FOUND, "Warsaw Pact",
    toQuote="East Germany withdrew from the pact following German reunification in 1990.",
    note="Same row as West Germany (germany): from 1955 to 1990 the row is in NATO and the Warsaw Pact at once.")

ent("comecon", "Comecon", "union", ["Comecon"])
span("comecon", "start", 1949, "25 January 1949", infobox=("Comecon", "year_start"))
span("comecon", "end", 1991, "28 June 1991 (final session; dissolution agreed within 90 days)",
     quote="The final Comecon council session took place on 28 June 1991, in Budapest, and led to an agreement to dissolve in 90 days.", page="Comecon")
CF = "The Comecon was founded in 1949 by the Soviet Union, Bulgaria, Czechoslovakia, Hungary, Poland, and Romania"
CEND = "The final Comecon council session took place on 28 June 1991"
for m in ["Soviet Union", "People's Republic of Bulgaria", "Czechoslovak Socialist Republic", "Hungarian People's Republic",
          "Polish People's Republic", "Socialist Republic of Romania"]:
    mem("comecon", m, 1949, 1991, CF, "Comecon", toQuote=CEND)
CJ = "its foundation was publicly announced on 25 January; Albania joined a month later and East Germany in 1950."
mem("comecon", "People's Socialist Republic of Albania", 1949, 1987, CJ, "Comecon",
    toQuote="Stopped participating in Comecon activities in 1961, withdrew in 1987.",
    note="Inactive from 1961; formal withdrawal 1987.")
mem("comecon", "East Germany", 1950, 1990, CJ, "Comecon", toQuote="Withdrew in 1990")
mem("comecon", "Mongolian People's Republic", 1962, 1991, "Mongolian People's Republic(Бүгд Найрамдах Монгол Ард Улс) June 1962", "Comecon", toQuote=CEND)
mem("comecon", "Republic of Cuba", 1972, 1991, "Republic of Cuba(República de Cuba) July 1972", "Comecon", toQuote=CEND)
mem("comecon", "Socialist Republic of Vietnam", 1978, 1991, "Socialist Republic of Vietnam(Cộng hòa xã hội chủ nghĩa Việt Nam) June 1978", "Comecon", toQuote=CEND)
gap("comecon", "Associate (Yugoslavia, 1964) and observer members left out; say if they should become memberships with a role.")

ent("seato", "SEATO", "union", ["Southeast Asia Treaty Organization"])
span("seato", "start", 1954, "8 September 1954", infobox=("Southeast Asia Treaty Organization", "formation"))
span("seato", "end", 1977, "30 June 1977", infobox=("Southeast Asia Treaty Organization", "dissolved"))
SEND = "the organization was formally dissolved on 30 June 1977"
for m in ["Australia", "France", "New Zealand", "Philippines", "Thailand", "United Kingdom", "United States"]:
    mem("seato", m, 1954, 1977, None, "Southeast Asia Treaty Organization", infobox=("num_members", m), toQuote=SEND,
        note="France withdrew financial support in 1975." if m == "France" else None)
mem("seato", "Pakistan", 1954, 1973, None, "Southeast Asia Treaty Organization", infobox=("num_members", "Pakistan"),
    toQuote="Pakistan withdrew in 1973, after East Pakistan seceded and became Bangladesh on 16 December 1971.")
gap("seato", "Protected non-members (Cambodia, Laos, South Vietnam) left out.")

ent("cento", "CENTO (Baghdad Pact)", "union", ["Central Treaty Organization"])
span("cento", "start", 1955, "24 February 1955", infobox=("Central Treaty Organization", "formation"))
span("cento", "end", 1979, "16 March 1979", infobox=("Central Treaty Organization", "dissolved"))
CB = "Iraq and Turkey sign a military agreement in Baghdad and the term \"Baghdad Pact\" started to be used."
CJ2 = "United Kingdom (April 5), Pakistan (September 23) and Iran (November 3) joined the Baghdad Pact"
mem("cento", "Turkey", 1955, 1979, CB, "Central Treaty Organization", toQuote="CENTO is formally disbanded. United Kingdom and Turkey withdraw from CENTO.")
mem("cento", "Kingdom of Iraq", 1955, 1959, CB, "Central Treaty Organization", toQuote="The new republican regime of Iraq withdrew the country from the alliance.",
    note="Withdrew 24 March 1959, after the 1958 revolution: the end falls in the First Republic, not the Kingdom of Iraq phase.")
mem("cento", "United Kingdom", 1955, 1979, CJ2, "Central Treaty Organization", toQuote="CENTO is formally disbanded. United Kingdom and Turkey withdraw from CENTO.")
mem("cento", "Pakistan", 1955, 1979, CJ2, "Central Treaty Organization", toQuote="Pakistan withdraws from CENTO.")
mem("cento", "Iran", 1955, 1979, CJ2, "Central Treaty Organization", toQuote="withdraws the country from CENTO.")
gap("cento", "The United States was an associate, never a member (it signed bilateral agreements in 1959); left out.")

# NAM memberships come from the Non-Aligned Movement member lists (parse_nam in build_claims.py).
ent("non-aligned-movement", "Non-Aligned Movement", "union", ["Non-Aligned Movement"])
span("non-aligned-movement", "start", 1961, "1 September 1961", infobox=("Non-Aligned Movement", "established"))
span("non-aligned-movement", "ongoing", None, None, quote="With the end of the Cold War, the Non-Aligned Movement transformed.", page="Non-Aligned Movement", optional=True)

# ---------------------------------------------------------------- Pilot: three theme rows (ideas, religions, movements)
ent("reformation", "Protestant Reformation", "theme", ["Reformation"])
span("reformation", "start", 1517, "31 October 1517",
     quote="The Reformation is usually dated from Martin Luther's publication of the Ninety-five Theses in 1517, which gave birth to Lutheranism.", page="Reformation")
span("reformation", "end", [1555, 1618, 1648], "disputed",
     quote="The end date of the Reformation is even more disputed: considered as political/martial strife, 25 September 1555 (when the Peace of Augsburg was accepted), 23 May 1618 and 24 October 1648 (when the Thirty Years' War began and ended, respectively) are the most commonly mentioned terminuses.", page="Reformation")
ev("reformation", "Ninety-five Theses", 1517, "31 October 1517", ["reformation", "hre"], "Ninety-five Theses",
   "On 31 October 1517, Luther sent a letter to the Archbishop of Mainz, Albert of Brandenburg, under whose authority the indulgences were being sold.")
ev("reformation", "Diet of Worms", 1521, "28 January – 25 May 1521", ["reformation", "hre"], "Diet of Worms",
   "The diet was conducted from 28 January to 25 May 1521 at the Bischofshof palace in Worms, with the Emperor presiding.")
ev("reformation", "Act of Supremacy", 1534, None, ["reformation", "united-kingdom"], "Acts of Supremacy",
   "The 1534 act declared King Henry VIII and his successors as the Supreme Head of the Church, replacing the Pope.", phaseNote="united-kingdom: Kingdom of England phase")
ev("reformation", "Council of Trent", 1545, "13 December 1545 – 4 December 1563", ["reformation"], "Council of Trent",
   "The council met for twenty-five sessions between 13 December 1545 and 4 December 1563.", end=1563,
   note="Catholic response: on the theme row only, or on a Papal States row if Modern States has one.")
ev("reformation", "Peace of Augsburg", 1555, "25 September 1555", ["reformation", "hre"], "Peace of Augsburg",
   "signed on 25 September 1555 in the German city of Augsburg.")
ev("reformation", "Peace of Westphalia", 1648, "October 1648", ["reformation", "hre", "sweden", "france", "spain", "netherlands"], "Peace of Westphalia",
   "The Peace of Westphalia (, ) is the collective name for two peace treaties signed in October 1648 in the Westphalian cities of Osnabrück and Münster.",
   note="Ends the existing thirty-years-war event (1618); check its tracks before choosing these.")
link("reformation", "thirty-years-war", "existing event; add the theme row to its tracks?")

ent("enlightenment", "The Enlightenment", "theme", ["Age of Enlightenment"])
span("enlightenment", "start", ["late 17th century", 1715], "disputed",
     quote="European historians traditionally dated its beginning with the death of Louis XIV of France in 1715 and its end with the outbreak of the French Revolution in 1789.", page="Age of Enlightenment",
     note="The lead also says it emerged 'in the late 17th century'. No single year: an approximate start is needed.")
span("enlightenment", "end", [1789, 1804], "disputed",
     quote="Many historians now date the end of the Enlightenment as the start of the 19th century, with the latest proposed year being the death of Immanuel Kant in 1804.", page="Age of Enlightenment")
ev("enlightenment", "Encyclopédie published", 1751, "1751–1772", ["enlightenment", "france"], "Encyclopédie",
   "was a general encyclopedia published in France between 1751 and 1772", end=1772)
ev("enlightenment", "Declaration of the Rights of Man and of the Citizen", 1789, "August 1789", ["enlightenment", "france"],
   "Declaration of the Rights of Man and of the Citizen",
   "In August 1789, Abbé Emmanuel Joseph Sieyès and Honoré Mirabeau played a central role in conceptualizing and drafting the final Declaration of the Rights of Man and of the Citizen.")
gap("enlightenment", "Thin: the enlightenment's milestones are books and people (Locke, Newton, Voltaire), which the data has no place for until person rows (Visuals 6).")

ent("abolitionism", "Abolition of slavery", "theme", ["Abolitionism"])
span("abolitionism", "start", 1772, "late 18th century (British movement); 1772 Somerset case",
     quote="The British abolitionist movement began in the late 18th century, and the 1772 Somersett case established that slavery did not exist in English law.", page="Abolitionism",
     note="Start is a choice: the British movement (late 18th c.), or earlier Quaker petitions. 1772 is the first datable milestone.")
span("abolitionism", "end", 1981, "1981 (Mauritania), or ongoing",
     quote="Mauritania is the latest country to officially abolish slavery, with a presidential decree in 1981.", page="Abolitionism",
     note="Or ongoing (modern anti-slavery). Recommend ending at 1888 for the Atlantic story and putting 1981 as an event, or splitting the row.")
ev("abolitionism", "Somerset v Stewart", 1772, "1772", ["abolitionism", "united-kingdom"], "Somerset v Stewart",
   "Somerset v Stewart (1772) 98 ER 499 (also known as Sommersett v Steuart, Somersett's case, and the Mansfield Judgment) is a judgment of the English Court of King's Bench")
ev("abolitionism", "France abolishes slavery", 1794, "4 February 1794", ["abolitionism", "france", "french-colonial-empire"], "Abolitionism",
   "on 4 February 1794, under the leadership of Maximilien Robespierre, abolished slavery in law in France and its colonies.",
   note="Napoleon restored slavery in 1802 (not cited here).")
ev("abolitionism", "Slave Trade Act", 1807, "25 March 1807", ["abolitionism", "united-kingdom", "british-empire"], "Abolitionism",
   "In 1807, the slave trade was made illegal throughout the British Empire, though existing slaves in British colonies were not liberated until the Slavery Abolition Act 1833.")
ev("abolitionism", "Thirteenth Amendment", 1865, "ratified 6 December 1865", ["abolitionism", "united-states"],
   "Thirteenth Amendment to the United States Constitution",
   "ratified by the required 27 of the then 36 states on December 6, 1865, and proclaimed on December 18, 1865.")
ev("abolitionism", "Mauritania abolishes slavery", 1981, None, ["abolitionism", "mauritania"], "Abolitionism",
   "Mauritania is the latest country to officially abolish slavery, with a presidential decree in 1981.")
link("abolitionism", "haitian-revolution", "existing event; add the theme row to its tracks?")
link("abolitionism", "slavery-abolition-act", "existing event (1833, british-empire); add the theme row")
link("abolitionism", "abolition-of-slavery-in-brazil", "existing event (1888, brazil); add the theme row")
link("abolitionism", "abolition-of-slavery-in-suriname", "existing event (1863); add the theme row")
