import pytest
from app.utils.formatting import (
    clean_whitespace,
    format_person_name,
    format_street_address,
    format_city_name,
    format_zip_code,
)

class TestPersonNameFormatting:
    def test_standard_names(self):
        assert format_person_name("josh sparks") == "Josh Sparks"
        assert format_person_name("glen woods") == "Glen Woods"
        assert format_person_name("rob bloom") == "Rob Bloom"
        assert format_person_name("JOSH SPARKS") == "Josh Sparks"
        assert format_person_name("  rob   bloom  ") == "Rob Bloom"

    def test_middle_initials(self):
        assert format_person_name("mark c niblack") == "Mark C. Niblack"
        assert format_person_name("mark c. niblack") == "Mark C. Niblack"
        assert format_person_name("mar c niblack") == "Mar C. Niblack"
        assert format_person_name("john f kennedy") == "John F. Kennedy"

    def test_apostrophes_and_hyphens(self):
        assert format_person_name("john o'brien") == "John O'Brien"
        assert format_person_name("MARY-JANE WATSON") == "Mary-Jane Watson"
        assert format_person_name("arthur conan-doyle") == "Arthur Conan-Doyle"
        assert format_person_name("d'angelo russell") == "D'Angelo Russell"

    def test_celtic_prefixes(self):
        assert format_person_name("ronald mcdonald") == "Ronald McDonald"
        assert format_person_name("WILLIAM MCKINLEY") == "William McKinley"
        assert format_person_name("douglas macarthur") == "Douglas MacArthur"
        assert format_person_name("colin macdonald") == "Colin MacDonald"

    def test_particles_and_foreign_names(self):
        assert format_person_name("juan de la cruz") == "Juan de la Cruz"
        assert format_person_name("vincent van gogh") == "Vincent van Gogh"
        assert format_person_name("de la cruz") == "De la Cruz"
        assert format_person_name("wayel syed") == "Wayel Syed"
        assert format_person_name("muhammad zeeshan khan") == "Muhammad Zeeshan Khan"

    def test_suffixes(self):
        assert format_person_name("robert smith jr") == "Robert Smith Jr."
        assert format_person_name("robert smith, jr.") == "Robert Smith, Jr."
        assert format_person_name("john smith iii") == "John Smith III"
        assert format_person_name("christian lavalle iii") == "Christian Lavalle III"
        assert format_person_name("christian lavalle the third") == "Christian Lavalle The Third"
        assert format_person_name("dr. jane doe md") == "Dr. Jane Doe MD"

    def test_empty_and_edge_cases(self):
        assert format_person_name("") == ""
        assert format_person_name(None) == ""
        assert format_person_name("   ") == ""


class TestAddressFormatting:
    def test_basic_street_formatting(self):
        assert format_street_address("  732   glen   arbor   dr  ") == "732 Glen Arbor Dr"
        assert format_street_address("4384 arcadia drive") == "4384 Arcadia Dr"
        assert format_street_address("100 main street") == "100 Main St"
        assert format_street_address("500 ocean avenue") == "500 Ocean Ave"
        assert format_street_address("250 pacific boulevard") == "250 Pacific Blvd"
        assert format_street_address("12 canyon road") == "12 Canyon Rd"

    def test_directionals(self):
        assert format_street_address("123 n coast hwy") == "123 N Coast Hwy"
        assert format_street_address("456 elm st nw") == "456 Elm St NW"
        assert format_street_address("789 s mission rd") == "789 S Mission Rd"
        assert format_street_address("101 se 3rd ave") == "101 SE 3rd Ave"

    def test_units_and_secondary_designators(self):
        assert format_street_address("456 elm st nw, apt 4b") == "456 Elm St NW, Apt 4B"
        assert format_street_address("100 main st # 3c") == "100 Main St #3C"
        assert format_street_address("200 ocean blvd, suite 400") == "200 Ocean Blvd, Ste 400"
        assert format_street_address("150 industrial way, unit 2a") == "150 Industrial Way, Unit 2A"
        assert format_street_address("50 trade center, bldg c") == "50 Trade Center, Bldg C"

    def test_po_boxes(self):
        assert format_street_address("po box 123") == "PO Box 123"
        assert format_street_address("p.o. box 789") == "PO Box 789"
        assert format_street_address("post office box 456") == "PO Box 456"

    def test_ordinal_streets(self):
        assert format_street_address("150 1st ave") == "150 1st Ave"
        assert format_street_address("300 42nd st") == "300 42nd St"
        assert format_street_address("50 3rd st") == "50 3rd St"

    def test_highways_and_routes(self):
        assert format_street_address("us-101") == "US-101"
        assert format_street_address("sr-76") == "SR-76"
        assert format_street_address("i-5") == "I-5"


class TestCityAndZipFormatting:
    def test_cities(self):
        assert format_city_name("oceanside") == "Oceanside"
        assert format_city_name("san diego") == "San Diego"
        assert format_city_name("la jolla") == "La Jolla"
        assert format_city_name("rancho santa fe") == "Rancho Santa Fe"
        assert format_city_name("solana beach") == "Solana Beach"
        assert format_city_name("al khoud") == "Al Khoud"
        assert format_city_name("  encinitas  ") == "Encinitas"

    def test_zip_codes(self):
        assert format_zip_code("92054") == "92054"
        assert format_zip_code(" 92054 ") == "92054"
        assert format_zip_code("92054-1234") == "92054-1234"
        assert format_zip_code("920541234") == "92054-1234"
        assert format_zip_code(None) is None
