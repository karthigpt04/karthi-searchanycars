import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CarCard } from '../components/CarCard'
import { TrustBar } from '../components/TrustBar'
import type { Listing } from '../types'
// format utilities used by child components

const budgetBrackets = [
  { label: 'Under ₹2L', max: 200000 },
  { label: '₹2-3L', min: 200000, max: 300000 },
  { label: '₹3-5L', min: 300000, max: 500000 },
  { label: '₹5-8L', min: 500000, max: 800000 },
  { label: '₹8-10L', min: 800000, max: 1000000 },
  { label: '₹10-15L', min: 1000000, max: 1500000 },
  { label: '₹15-20L', min: 1500000, max: 2000000 },
  { label: 'Above ₹20L', min: 2000000 },
]

const LOGO_BASE = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized'

const brands = [
  { name: 'Maruti Suzuki', slug: 'suzuki' },
  { name: 'Hyundai', slug: 'hyundai' },
  { name: 'Tata', slug: 'tata' },
  { name: 'Honda', slug: 'honda' },
  { name: 'Kia', slug: 'kia' },
  { name: 'Mahindra', slug: 'mahindra' },
  { name: 'Toyota', slug: 'toyota' },
  { name: 'Volkswagen', slug: 'volkswagen' },
  { name: 'Škoda', slug: 'skoda' },
  { name: 'BMW', slug: 'bmw' },
  { name: 'Mercedes-Benz', slug: 'mercedes-benz' },
  { name: 'Audi', slug: 'audi' },
  { name: 'Ford', slug: 'ford' },
  { name: 'Renault', slug: 'renault' },
  { name: 'Nissan', slug: 'nissan' },
  { name: 'MG', slug: 'mg' },
  { name: 'Jeep', slug: 'jeep' },
  { name: 'Volvo', slug: 'volvo' },
  { name: 'Lexus', slug: 'lexus' },
  { name: 'Porsche', slug: 'porsche' },
  { name: 'Jaguar', slug: 'jaguar' },
  { name: 'Land Rover', slug: 'land-rover' },
  { name: 'Mini', slug: 'mini' },
  { name: 'Citroën', slug: 'citroen' },
  { name: 'Isuzu', slug: 'isuzu' },
  { name: 'Mitsubishi', slug: 'mitsubishi' },
  { name: 'Fiat', slug: 'fiat' },
  { name: 'Chevrolet', slug: 'chevrolet' },
  { name: 'Rolls-Royce', slug: 'rolls-royce' },
  { name: 'Bentley', slug: 'bentley' },
  { name: '9ff', slug: '9ff' },
  { name: 'Abadal', slug: 'abadal' },
  { name: 'Abarth', slug: 'abarth' },
  { name: 'Abbott-Detroit', slug: 'abbott-detroit' },
  { name: 'ABT', slug: 'abt' },
  { name: 'AC', slug: 'ac' },
  { name: 'Acura', slug: 'acura' },
  { name: 'Aiways', slug: 'aiways' },
  { name: 'Aixam', slug: 'aixam' },
  { name: 'Alfa Romeo', slug: 'alfa-romeo' },
  { name: 'Alpina', slug: 'alpina' },
  { name: 'Alpine', slug: 'alpine' },
  { name: 'Alta', slug: 'alta' },
  { name: 'Alvis', slug: 'alvis' },
  { name: 'AMC', slug: 'amc' },
  { name: 'Apollo', slug: 'apollo' },
  { name: 'Arash', slug: 'arash' },
  { name: 'Arcfox', slug: 'arcfox' },
  { name: 'Ariel', slug: 'ariel' },
  { name: 'ARO', slug: 'aro' },
  { name: 'Arrinera', slug: 'arrinera' },
  { name: 'Arrival', slug: 'arrival' },
  { name: 'Artega', slug: 'artega' },
  { name: 'Ascari', slug: 'ascari' },
  { name: 'Askam', slug: 'askam' },
  { name: 'Aspark', slug: 'aspark' },
  { name: 'Aston Martin', slug: 'aston-martin' },
  { name: 'Atalanta', slug: 'atalanta' },
  { name: 'Auburn', slug: 'auburn' },
  { name: 'Audi Sport', slug: 'audi-sport' },
  { name: 'Austin', slug: 'austin' },
  { name: 'Autobacs', slug: 'autobacs' },
  { name: 'Autobianchi', slug: 'autobianchi' },
  { name: 'Axon', slug: 'axon' },
  { name: 'BAC', slug: 'bac' },
  { name: 'BAIC Motor', slug: 'baic-motor' },
  { name: 'Baojun', slug: 'baojun' },
  { name: 'BeiBen', slug: 'beiben' },
  { name: 'Berkeley', slug: 'berkeley' },
  { name: 'Berliet', slug: 'berliet' },
  { name: 'Bertone', slug: 'bertone' },
  { name: 'Bestune', slug: 'bestune' },
  { name: 'BharatBenz', slug: 'bharatbenz' },
  { name: 'Bitter', slug: 'bitter' },
  { name: 'Bizzarrini', slug: 'bizzarrini' },
  { name: 'BMW M', slug: 'bmw-m' },
  { name: 'Borgward', slug: 'borgward' },
  { name: 'Bowler', slug: 'bowler' },
  { name: 'Brabus', slug: 'brabus' },
  { name: 'Brammo', slug: 'brammo' },
  { name: 'Brilliance', slug: 'brilliance' },
  { name: 'Bristol', slug: 'bristol' },
  { name: 'Brooke', slug: 'brooke' },
  { name: 'Bufori', slug: 'bufori' },
  { name: 'Bugatti', slug: 'bugatti' },
  { name: 'Buick', slug: 'buick' },
  { name: 'BYD', slug: 'byd' },
  { name: 'Byton', slug: 'byton' },
  { name: 'Cadillac', slug: 'cadillac' },
  { name: 'CAMC', slug: 'camc' },
  { name: 'Canoo', slug: 'canoo' },
  { name: 'Caparo', slug: 'caparo' },
  { name: 'Carlsson', slug: 'carlsson' },
  { name: 'Caterham', slug: 'caterham' },
  { name: 'Changan', slug: 'changan' },
  { name: 'Changfeng', slug: 'changfeng' },
  { name: 'Chery', slug: 'chery' },
  { name: 'Chevrolet Corvette', slug: 'chevrolet-corvette' },
  { name: 'Chrysler', slug: 'chrysler' },
  { name: 'Cisitalia', slug: 'cisitalia' },
  { name: 'Cizeta', slug: 'cizeta' },
  { name: 'Cole', slug: 'cole' },
  { name: 'Corre La Licorne', slug: 'corre-la-licorne' },
  { name: 'Cupra', slug: 'cupra' },
  { name: 'Dacia', slug: 'dacia' },
  { name: 'Daewoo', slug: 'daewoo' },
  { name: 'DAF', slug: 'daf' },
  { name: 'Daihatsu', slug: 'daihatsu' },
  { name: 'Daimler', slug: 'daimler' },
  { name: 'Dartz', slug: 'dartz' },
  { name: 'Datsun', slug: 'datsun' },
  { name: 'David Brown', slug: 'david-brown' },
  { name: 'Dayun', slug: 'dayun' },
  { name: 'De Tomaso', slug: 'de-tomaso' },
  { name: 'Delage', slug: 'delage' },
  { name: 'DeSoto', slug: 'desoto' },
  { name: 'Detroit Electric', slug: 'detroit-electric' },
  { name: 'Devel Sixteen', slug: 'devel-sixteen' },
  { name: 'Diatto', slug: 'diatto' },
  { name: 'DINA', slug: 'dina' },
  { name: 'DKW', slug: 'dkw' },
  { name: 'DMC', slug: 'dmc' },
  { name: 'Dodge', slug: 'dodge' },
  { name: 'Dodge Viper', slug: 'dodge-viper' },
  { name: 'Dongfeng', slug: 'dongfeng' },
  { name: 'Donkervoort', slug: 'donkervoort' },
  { name: 'Drako', slug: 'drako' },
  { name: 'DS', slug: 'ds' },
  { name: 'Duesenberg', slug: 'duesenberg' },
  { name: 'Eagle', slug: 'eagle' },
  { name: 'EDAG', slug: 'edag' },
  { name: 'Edsel', slug: 'edsel' },
  { name: 'Eicher', slug: 'eicher' },
  { name: 'Elemental', slug: 'elemental' },
  { name: 'Elfin', slug: 'elfin' },
  { name: 'Elva', slug: 'elva' },
  { name: 'Englon', slug: 'englon' },
  { name: 'ERF', slug: 'erf' },
  { name: 'Eterniti', slug: 'eterniti' },
  { name: 'Exeed', slug: 'exeed' },
  { name: 'Facel Vega', slug: 'facel-vega' },
  { name: 'Faraday Future', slug: 'faraday-future' },
  { name: 'FAW', slug: 'faw' },
  { name: 'FAW Jiefang', slug: 'faw-jiefang' },
  { name: 'Ferrari', slug: 'ferrari' },
  { name: 'Fioravanti', slug: 'fioravanti' },
  { name: 'Fisker', slug: 'fisker' },
  { name: 'Foden', slug: 'foden' },
  { name: 'Force Motors', slug: 'force-motors' },
  { name: 'Ford Mustang', slug: 'ford-mustang' },
  { name: 'Foton', slug: 'foton' },
  { name: 'FPV', slug: 'fpv' },
  { name: 'Franklin', slug: 'franklin' },
  { name: 'Freightliner', slug: 'freightliner' },
  { name: 'FSO', slug: 'fso' },
  { name: 'GAC Group', slug: 'gac-group' },
  { name: 'Gardner Douglas', slug: 'gardner-douglas' },
  { name: 'GAZ', slug: 'gaz' },
  { name: 'Geely', slug: 'geely' },
  { name: 'General Motors', slug: 'general-motors' },
  { name: 'Genesis', slug: 'genesis' },
  { name: 'Geo', slug: 'geo' },
  { name: 'Geometry', slug: 'geometry' },
  { name: 'Gilbern', slug: 'gilbern' },
  { name: 'Gillet', slug: 'gillet' },
  { name: 'Ginetta', slug: 'ginetta' },
  { name: 'GMC', slug: 'gmc' },
  { name: 'Golden Dragon', slug: 'golden-dragon' },
  { name: 'Gonow', slug: 'gonow' },
  { name: 'Great Wall', slug: 'great-wall' },
  { name: 'Grinnall', slug: 'grinnall' },
  { name: 'Gumpert', slug: 'gumpert' },
  { name: 'Hafei', slug: 'hafei' },
  { name: 'Haima', slug: 'haima' },
  { name: 'Haval', slug: 'haval' },
  { name: 'Hawtai', slug: 'hawtai' },
  { name: 'Hennessey', slug: 'hennessey' },
  { name: 'Higer', slug: 'higer' },
  { name: 'Hillman', slug: 'hillman' },
  { name: 'Hindustan Motors', slug: 'hindustan-motors' },
  { name: 'Hino', slug: 'hino' },
  { name: 'HiPhi', slug: 'hiphi' },
  { name: 'Hispano-Suiza', slug: 'hispano-suiza' },
  { name: 'Holden', slug: 'holden' },
  { name: 'Hommell', slug: 'hommell' },
  { name: 'Hongqi', slug: 'hongqi' },
  { name: 'Hongyan', slug: 'hongyan' },
  { name: 'Horch', slug: 'horch' },
  { name: 'HSV', slug: 'hsv' },
  { name: 'Hudson', slug: 'hudson' },
  { name: 'Hummer', slug: 'hummer' },
  { name: 'Hupmobile', slug: 'hupmobile' },
  { name: 'IC Bus', slug: 'ic-bus' },
  { name: 'IH', slug: 'ih' },
  { name: 'IKCO', slug: 'ikco' },
  { name: 'Infiniti', slug: 'infiniti' },
  { name: 'Innocenti', slug: 'innocenti' },
  { name: 'Intermeccanica', slug: 'intermeccanica' },
  { name: 'International', slug: 'international' },
  { name: 'Irizar', slug: 'irizar' },
  { name: 'Isdera', slug: 'isdera' },
  { name: 'Iso', slug: 'iso' },
  { name: 'Iveco', slug: 'iveco' },
  { name: 'JAC', slug: 'jac' },
  { name: 'Jawa', slug: 'jawa' },
  { name: 'JBA Motors', slug: 'jba-motors' },
  { name: 'Jensen', slug: 'jensen' },
  { name: 'Jetour', slug: 'jetour' },
  { name: 'Jetta', slug: 'jetta' },
  { name: 'JMC', slug: 'jmc' },
  { name: 'Kaiser', slug: 'kaiser' },
  { name: 'Kamaz', slug: 'kamaz' },
  { name: 'Karlmann King', slug: 'karlmann-king' },
  { name: 'Karma', slug: 'karma' },
  { name: 'Keating', slug: 'keating' },
  { name: 'Kenworth', slug: 'kenworth' },
  { name: 'King Long', slug: 'king-long' },
  { name: 'Koenigsegg', slug: 'koenigsegg' },
  { name: 'KTM', slug: 'ktm' },
  { name: 'Lada', slug: 'lada' },
  { name: 'Lagonda', slug: 'lagonda' },
  { name: 'Lamborghini', slug: 'lamborghini' },
  { name: 'Lancia', slug: 'lancia' },
  { name: 'Landwind', slug: 'landwind' },
  { name: 'Laraki', slug: 'laraki' },
  { name: 'Leapmotor', slug: 'leapmotor' },
  { name: 'LEVC', slug: 'levc' },
  { name: 'Leyland', slug: 'leyland' },
  { name: 'Li Auto', slug: 'li-auto' },
  { name: 'Lifan', slug: 'lifan' },
  { name: 'Ligier', slug: 'ligier' },
  { name: 'Lincoln', slug: 'lincoln' },
  { name: 'Lister', slug: 'lister' },
  { name: 'Lloyd', slug: 'lloyd' },
  { name: 'Lobini', slug: 'lobini' },
  { name: 'Lordstown', slug: 'lordstown' },
  { name: 'Lotus', slug: 'lotus' },
  { name: 'Lucid', slug: 'lucid' },
  { name: 'Luxgen', slug: 'luxgen' },
  { name: 'Lynk & Co', slug: 'lynk-and-co' },
  { name: 'Mack', slug: 'mack' },
  { name: 'MAN', slug: 'man' },
  { name: 'Mansory', slug: 'mansory' },
  { name: 'Marcos', slug: 'marcos' },
  { name: 'Marlin', slug: 'marlin' },
  { name: 'Maserati', slug: 'maserati' },
  { name: 'Mastretta', slug: 'mastretta' },
  { name: 'Maxus', slug: 'maxus' },
  { name: 'Maybach', slug: 'maybach' },
  { name: 'MAZ', slug: 'maz' },
  { name: 'Mazda', slug: 'mazda' },
  { name: 'Mazzanti', slug: 'mazzanti' },
  { name: 'McLaren', slug: 'mclaren' },
  { name: 'Melkus', slug: 'melkus' },
  { name: 'Mercedes-AMG', slug: 'mercedes-amg' },
  { name: 'Mercury', slug: 'mercury' },
  { name: 'Merkur', slug: 'merkur' },
  { name: 'MEV', slug: 'mev' },
  { name: 'Microcar', slug: 'microcar' },
  { name: 'Mitsuoka', slug: 'mitsuoka' },
  { name: 'MK', slug: 'mk' },
  { name: 'Morgan', slug: 'morgan' },
  { name: 'Morris', slug: 'morris' },
  { name: 'Mosler', slug: 'mosler' },
  { name: 'Navistar', slug: 'navistar' },
  { name: 'NEVS', slug: 'nevs' },
  { name: 'Nikola', slug: 'nikola' },
  { name: 'NIO', slug: 'nio' },
  { name: 'Nissan GT-R', slug: 'nissan-gt-r' },
  { name: 'Nissan Nismo', slug: 'nissan-nismo' },
  { name: 'Noble', slug: 'noble' },
  { name: 'Oldsmobile', slug: 'oldsmobile' },
  { name: 'Oltcit', slug: 'oltcit' },
  { name: 'Omoda', slug: 'omoda' },
  { name: 'Opel', slug: 'opel' },
  { name: 'OSCA', slug: 'osca' },
  { name: 'Paccar', slug: 'paccar' },
  { name: 'Packard', slug: 'packard' },
  { name: 'Pagani', slug: 'pagani' },
  { name: 'Panhard', slug: 'panhard' },
  { name: 'Panoz', slug: 'panoz' },
  { name: 'Pegaso', slug: 'pegaso' },
  { name: 'Perodua', slug: 'perodua' },
  { name: 'Peterbilt', slug: 'peterbilt' },
  { name: 'Peugeot', slug: 'peugeot' },
  { name: 'PGO', slug: 'pgo' },
  { name: 'Pierce-Arrow', slug: 'pierce-arrow' },
  { name: 'Pininfarina', slug: 'pininfarina' },
  { name: 'Plymouth', slug: 'plymouth' },
  { name: 'Polestar', slug: 'polestar' },
  { name: 'Pontiac', slug: 'pontiac' },
  { name: 'Praga', slug: 'praga' },
  { name: 'Premier', slug: 'premier' },
  { name: 'Prodrive', slug: 'prodrive' },
  { name: 'Proton', slug: 'proton' },
  { name: 'Qoros', slug: 'qoros' },
  { name: 'Radical', slug: 'radical' },
  { name: 'RAM', slug: 'ram' },
  { name: 'Rambler', slug: 'rambler' },
  { name: 'Ranz', slug: 'ranz' },
  { name: 'Renault Samsung', slug: 'renault-samsung' },
  { name: 'Rezvani', slug: 'rezvani' },
  { name: 'Riley', slug: 'riley' },
  { name: 'Rimac', slug: 'rimac' },
  { name: 'Rinspeed', slug: 'rinspeed' },
  { name: 'Rivian', slug: 'rivian' },
  { name: 'Roewe', slug: 'roewe' },
  { name: 'Ronart', slug: 'ronart' },
  { name: 'Rossion', slug: 'rossion' },
  { name: 'Rover', slug: 'rover' },
  { name: 'RUF', slug: 'ruf' },
  { name: 'Saab', slug: 'saab' },
  { name: 'SAIC Motor', slug: 'saic-motor' },
  { name: 'Saipa', slug: 'saipa' },
  { name: 'Saleen', slug: 'saleen' },
  { name: 'Saturn', slug: 'saturn' },
  { name: 'Scania', slug: 'scania' },
  { name: 'Scion', slug: 'scion' },
  { name: 'SEAT', slug: 'seat' },
  { name: 'Setra', slug: 'setra' },
  { name: 'SEV', slug: 'sev' },
  { name: 'Shacman', slug: 'shacman' },
  { name: 'Simca', slug: 'simca' },
  { name: 'Singer', slug: 'singer' },
  { name: 'Singulato', slug: 'singulato' },
  { name: 'Sinotruk', slug: 'sinotruk' },
  { name: 'Sisu', slug: 'sisu' },
  { name: 'Smart', slug: 'smart' },
  { name: 'Soueast', slug: 'soueast' },
  { name: 'Spania GTA', slug: 'spania-gta' },
  { name: 'Spirra', slug: 'spirra' },
  { name: 'Spyker', slug: 'spyker' },
  { name: 'SsangYong', slug: 'ssangyong' },
  { name: 'SSC', slug: 'ssc' },
  { name: 'Sterling', slug: 'sterling' },
  { name: 'Studebaker', slug: 'studebaker' },
  { name: 'Stutz', slug: 'stutz' },
  { name: 'Subaru', slug: 'subaru' },
  { name: 'Suffolk', slug: 'suffolk' },
  { name: 'Talbot', slug: 'talbot' },
  { name: 'Tatra', slug: 'tatra' },
  { name: 'Tauro', slug: 'tauro' },
  { name: 'TechArt', slug: 'techart' },
  { name: 'Tesla', slug: 'tesla' },
  { name: 'Toyota Alphard', slug: 'toyota-alphard' },
  { name: 'Toyota Century', slug: 'toyota-century' },
  { name: 'Toyota Crown', slug: 'toyota-crown' },
  { name: 'Tramontana', slug: 'tramontana' },
  { name: 'Trion', slug: 'trion' },
  { name: 'Triumph', slug: 'triumph' },
  { name: 'Troller', slug: 'troller' },
  { name: 'Tucker', slug: 'tucker' },
  { name: 'TVR', slug: 'tvr' },
  { name: 'UAZ', slug: 'uaz' },
  { name: 'UD', slug: 'ud' },
  { name: 'Ultima', slug: 'ultima' },
  { name: 'Vandenbrink', slug: 'vandenbrink' },
  { name: 'Vauxhall', slug: 'vauxhall' },
  { name: 'Vector', slug: 'vector' },
  { name: 'Vencer', slug: 'vencer' },
  { name: 'Venturi', slug: 'venturi' },
  { name: 'Venucia', slug: 'venucia' },
  { name: 'VinFast', slug: 'vinfast' },
  { name: 'VLF', slug: 'vlf' },
  { name: 'W Motors', slug: 'w-motors' },
  { name: 'Wanderer', slug: 'wanderer' },
  { name: 'Wartburg', slug: 'wartburg' },
  { name: 'Weltmeister', slug: 'weltmeister' },
  { name: 'Western Star', slug: 'western-star' },
  { name: 'Westfield', slug: 'westfield' },
  { name: 'WEY', slug: 'wey' },
  { name: 'Wiesmann', slug: 'wiesmann' },
  { name: 'Willys-Overland', slug: 'willys-overland' },
  { name: 'Workhorse', slug: 'workhorse' },
  { name: 'Wuling', slug: 'wuling' },
  { name: 'XPeng', slug: 'xpeng' },
  { name: 'Yulon', slug: 'yulon' },
  { name: 'Yutong', slug: 'yutong' },
  { name: 'Zarooq Motors', slug: 'zarooq-motors' },
  { name: 'Zastava', slug: 'zastava' },
  { name: 'ZAZ', slug: 'zaz' },
  { name: 'Zeekr', slug: 'zeekr' },
  { name: 'Zenos', slug: 'zenos' },
  { name: 'Zenvo', slug: 'zenvo' },
  { name: 'Zhongtong', slug: 'zhongtong' },
  { name: 'Zinoro', slug: 'zinoro' },
  { name: 'Zotye', slug: 'zotye' },
]

const bodyTypes = [
  { name: 'Hatchback', icon: '🚗', count: '280+' },
  { name: 'Sedan', icon: '🚘', count: '195+' },
  { name: 'SUV', icon: '🚙', count: '420+' },
  { name: 'MUV', icon: '🚐', count: '85+' },
  { name: 'Luxury Sedan', icon: '🏎️', count: '45+' },
  { name: 'Luxury SUV', icon: '🛻', count: '55+' },
]

const fuelTypes = [
  { name: 'Petrol', icon: '⛽', count: '580+' },
  { name: 'Diesel', icon: '🛢️', count: '320+' },
  { name: 'CNG', icon: '💨', count: '95+' },
  { name: 'Electric', icon: '⚡', count: '45+' },
]

const cities = [
  { name: 'New Delhi', slug: 'new-delhi', count: '1,200+', landmark: 'India Gate' },
  { name: 'Mumbai', slug: 'mumbai', count: '1,800+', landmark: 'Gateway of India' },
  { name: 'Bengaluru', slug: 'bengaluru', count: '950+', landmark: 'Vidhana Soudha' },
  { name: 'Chennai', slug: 'chennai', count: '720+', landmark: 'Marina Beach' },
  { name: 'Hyderabad', slug: 'hyderabad', count: '680+', landmark: 'Charminar' },
  { name: 'Pune', slug: 'pune', count: '540+', landmark: 'Shaniwar Wada' },
  { name: 'Ahmedabad', slug: 'ahmedabad', count: '420+', landmark: 'Sabarmati Ashram' },
  { name: 'Jaipur', slug: 'jaipur', count: '380+', landmark: 'Hawa Mahal' },
  { name: 'Lucknow', slug: 'lucknow', count: '310+', landmark: 'Bara Imambara' },
  { name: 'Kolkata', slug: 'kolkata', count: '650+', landmark: 'Victoria Memorial' },
  { name: 'Chandigarh', slug: 'chandigarh', count: '290+', landmark: 'Rock Garden' },
  { name: 'Kochi', slug: 'kochi', count: '260+', landmark: 'Chinese Fishing Nets' },
  { name: 'Coimbatore', slug: 'coimbatore', count: '220+', landmark: 'Marudamalai Temple' },
  { name: 'Indore', slug: 'indore', count: '180+', landmark: 'Rajwada Palace' },
  { name: 'Nagpur', slug: 'nagpur', count: '170+', landmark: 'Deekshabhoomi' },
  { name: 'Surat', slug: 'surat', count: '200+', landmark: 'Surat Castle' },
  { name: 'Vizag', slug: 'vizag', count: '150+', landmark: 'Kailasagiri' },
  { name: 'Mysuru', slug: 'mysuru', count: '140+', landmark: 'Mysore Palace' },
  { name: 'Bhopal', slug: 'bhopal', count: '160+', landmark: 'Taj-ul-Masajid' },
  { name: 'Thiruvananthapuram', slug: 'thiruvananthapuram', count: '130+', landmark: 'Padmanabhaswamy Temple' },
]

const CITY_IMAGES: Record<string, string> = {
  'new-delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop',
  'mumbai': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=300&fit=crop',
  'bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=300&fit=crop',
  'chennai': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=300&fit=crop',
  'hyderabad': 'https://images.unsplash.com/photo-1603813507806-0d813daa0db7?w=400&h=300&fit=crop',
  'pune': 'https://images.unsplash.com/photo-1572782252655-9c8771392601?w=400&h=300&fit=crop',
  'ahmedabad': 'https://images.unsplash.com/photo-1609948543911-7137d317e341?w=400&h=300&fit=crop',
  'jaipur': 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=300&fit=crop',
  'lucknow': 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&h=300&fit=crop',
  'kolkata': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop',
  'chandigarh': 'https://images.unsplash.com/photo-1590075865003-e48277faa558?w=400&h=300&fit=crop',
  'kochi': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=300&fit=crop',
  'coimbatore': 'https://images.unsplash.com/photo-1621425998794-3461c1e12a58?w=400&h=300&fit=crop',
  'indore': 'https://images.unsplash.com/photo-1590766940554-634aea448719?w=400&h=300&fit=crop',
  'nagpur': 'https://images.unsplash.com/photo-1614252234498-1ab7ec10c3b8?w=400&h=300&fit=crop',
  'surat': 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=400&h=300&fit=crop',
  'vizag': 'https://images.unsplash.com/photo-1620230874645-0d85f0f6f2a2?w=400&h=300&fit=crop',
  'mysuru': 'https://images.unsplash.com/photo-1600112356915-089fba68faa2?w=400&h=300&fit=crop',
  'bhopal': 'https://images.unsplash.com/photo-1600112357645-cd0e5b6e0d6c?w=400&h=300&fit=crop',
  'thiruvananthapuram': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=400&h=300&fit=crop',
}

const reviews = [
  { name: 'Rahul S.', city: 'New Delhi', car: 'Hyundai Creta', text: 'Found the perfect Creta within 2 days. The inspection report gave me complete confidence. Delivered to my doorstep in pristine condition!', rating: 5 },
  { name: 'Priya M.', city: 'Mumbai', car: 'Honda City', text: 'The fixed pricing was such a relief - no haggling! The 7-day return policy sealed the deal. My City is running perfectly.', rating: 5 },
  { name: 'Vikram K.', city: 'Bengaluru', car: 'Tata Nexon', text: 'Best used car buying experience. The EMI calculator helped me plan my finances. The free RC transfer saved me so much hassle.', rating: 5 },
]

export const HomePage = () => {
  const navigate = useNavigate()
  const [featuredCars, setFeaturedCars] = useState<Listing[]>([])
  const [allCars, setAllCars] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTab, setSearchTab] = useState<'budget' | 'brand'>('budget')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showAllCities, setShowAllCities] = useState(false)
  const [featuredTab, setFeaturedTab] = useState('best')
  const [error, setError] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [showAllHeroBrands, setShowAllHeroBrands] = useState(false)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('sac_wishlist') || '[]') } catch { return [] }
  })

  useEffect(() => {
    let cancelled = false
    api.getListings({}).then((data) => {
      if (cancelled) return
      setAllCars(data)
      setFeaturedCars(data.filter((c) => c.featured_listing).slice(0, 6))
    }).catch(() => { if (!cancelled) setError('Failed to load cars.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('sac_wishlist', JSON.stringify(next))
      return next
    })
  }

  const toggleCity = (cityName: string) => {
    setSelectedCities((prev) =>
      prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
    )
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (selectedBudget) {
      const bracket = budgetBrackets.find((b) => b.label === selectedBudget)
      if (bracket?.min) params.set('listing_price_min', String(bracket.min))
      if (bracket?.max) params.set('listing_price_max', String(bracket.max))
    }
    if (selectedCities.length > 0) params.set('location_city', selectedCities.join(','))
    navigate(`/search?${params.toString()}`)
  }

  const displayedFeatured = featuredTab === 'best'
    ? featuredCars
    : featuredTab === 'new'
    ? [...allCars].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6)
    : [...allCars].slice(0, 6)

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Find Your Perfect Used Car</h1>
            <p className="hero-subtitle">
              Browse 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery across India
            </p>

            {/* Hero Search Box */}
            <div className="hero-search">
              <div className="search-tabs">
                <button
                  className={`search-tab ${searchTab === 'budget' ? 'active' : ''}`}
                  onClick={() => setSearchTab('budget')}
                  type="button"
                >
                  Search by Budget
                </button>
                <button
                  className={`search-tab ${searchTab === 'brand' ? 'active' : ''}`}
                  onClick={() => setSearchTab('brand')}
                  type="button"
                >
                  Search by Brand
                </button>
              </div>

              <div className="search-body">
                {searchTab === 'budget' ? (
                  <>
                    <div className="search-budget-grid">
                      {budgetBrackets.map((b) => (
                        <button
                          key={b.label}
                          className={`budget-chip ${selectedBudget === b.label ? 'active' : ''}`}
                          onClick={() => setSelectedBudget(selectedBudget === b.label ? '' : b.label)}
                          type="button"
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <div className="search-city-row" style={{ marginTop: '0.75rem' }}>
                      <div className="city-multi-select">
                        <button
                          className="city-multi-select-trigger"
                          onClick={() => setShowCityDropdown((prev) => !prev)}
                          type="button"
                        >
                          {selectedCities.length === 0
                            ? 'Select Cities'
                            : `${selectedCities.length} ${selectedCities.length === 1 ? 'city' : 'cities'} selected`}
                          <span className={`chevron ${showCityDropdown ? 'open' : ''}`}>&#9660;</span>
                        </button>
                        {selectedCities.length > 0 && (
                          <div className="city-selected-chips">
                            {selectedCities.map((c) => (
                              <span key={c} className="city-selected-chip">
                                {c} <button type="button" onClick={(e) => { e.stopPropagation(); toggleCity(c) }}>&#10005;</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {showCityDropdown && (
                          <div className="city-multi-dropdown">
                            {cities.map((c) => (
                              <label key={c.name} className={`city-dropdown-item ${selectedCities.includes(c.name) ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedCities.includes(c.name)}
                                  onChange={() => toggleCity(c.name)}
                                />
                                <span>{c.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="btn btn-primary" onClick={handleSearch} type="button">
                        Find Your Car
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="search-brand-grid">
                      {(showAllHeroBrands ? brands : brands.slice(0, 10)).map((b) => (
                        <Link
                          key={b.name}
                          to={`/search?brand=${encodeURIComponent(b.name)}`}
                          className="brand-chip"
                        >
                          <img className="brand-logo-img" src={`${LOGO_BASE}/${b.slug}.png`} alt={b.name} />
                          <span className="brand-label">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                    <button
                      className="brand-show-more-btn"
                      onClick={() => setShowAllHeroBrands((prev) => !prev)}
                      type="button"
                    >
                      {showAllHeroBrands ? 'Show Less' : `Show All ${brands.length} Brands`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <TrustBar />

      {/* Browse by Body Type */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Body Type</h2>
            <Link to="/search" className="text-link">View All</Link>
          </div>
          <div className="body-type-grid">
            {bodyTypes.map((t) => (
              <Link key={t.name} to={`/search?body_style=${encodeURIComponent(t.name)}`} className="body-type-card">
                <span className="body-type-icon">{t.icon}</span>
                <span className="body-type-name">{t.name}</span>
                <span className="body-type-count">{t.count} cars</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by City */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head">
            <h2>Browse by City</h2>
            <button
              className="text-link"
              onClick={() => setShowAllCities((prev) => !prev)}
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showAllCities ? 'Show Less' : 'Show More'}
            </button>
          </div>
          <div className="city-browse-grid">
            {(showAllCities ? cities : cities.slice(0, 8)).map((c) => (
              <Link key={c.name} to={`/search?location_city=${encodeURIComponent(c.name)}`} className="city-browse-card">
                <div className="city-card-image">
                  <img
                    src={CITY_IMAGES[c.slug]}
                    alt={c.landmark}
                    loading="lazy"
                  />
                  <div className="city-card-overlay" />
                </div>
                <div className="city-card-info">
                  <span className="city-card-name">{c.name}</span>
                  <span className="city-card-landmark">{c.landmark}</span>
                  <span className="city-card-count">{c.count} cars</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Brand */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Brand</h2>
            <button
              className="text-link"
              onClick={() => setShowAllBrands((prev) => !prev)}
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showAllBrands ? 'Show Less' : 'Show More'}
            </button>
          </div>
          <div className="brand-browse-grid">
            {(showAllBrands ? brands : brands.slice(0, 10)).map((b) => (
              <Link key={b.name} to={`/search?brand=${encodeURIComponent(b.name)}`} className="brand-browse-card">
                <img className="brand-logo-img brand-logo-img-lg" src={`${LOGO_BASE}/${b.slug}.png`} alt={b.name} />
                <span className="brand-name">{b.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Featured Cars</h2>
            <Link to="/search" className="text-link">Browse All</Link>
          </div>

          <div className="featured-tabs">
            {[
              { key: 'best', label: 'Best Buys' },
              { key: 'new', label: 'Newly Added' },
              { key: 'all', label: 'All Cars' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`featured-tab ${featuredTab === tab.key ? 'active' : ''}`}
                onClick={() => setFeaturedTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-text-lg skeleton" />
                  <div className="skeleton-text skeleton" />
                  <div className="skeleton-text skeleton" style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Could not load cars</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()} type="button">Retry</button>
            </div>
          ) : displayedFeatured.length === 0 ? (
            <div className="empty-state">
              <h3>No featured cars available</h3>
              <p>Check back soon for new listings.</p>
              <Link to="/search" className="btn btn-primary">Browse All Cars</Link>
            </div>
          ) : (
            <div className="card-grid">
              {displayedFeatured.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isWishlisted={wishlist.includes(car.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Browse by Budget */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Budget</h2>
          </div>
          <div className="budget-pills">
            {budgetBrackets.map((b) => (
              <Link
                key={b.label}
                to={`/search?${[b.min ? `listing_price_min=${b.min}` : '', b.max ? `listing_price_max=${b.max}` : ''].filter(Boolean).join('&')}`}
                className="budget-pill"
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* S-Plus Premium Banner */}
      <section className="splus-home-banner">
        <div className="container">
          <div className="splus-home-banner-content">
            <div className="splus-home-banner-text">
              <div className="splus-badge-label">S-Plus Premium</div>
              <h2>Experience Luxury, Pre-Owned</h2>
              <p>Handpicked premium cars with 300-point inspection, 2-year warranty, and dedicated concierge service.</p>
              <Link to="/splus" className="splus-btn-gold">Explore S-Plus Collection</Link>
            </div>
            <div className="splus-home-banner-features">
              <div className="splus-home-feature">
                <span className="splus-home-feature-icon">&#9670;</span>
                <span>300-Point Inspection</span>
              </div>
              <div className="splus-home-feature">
                <span className="splus-home-feature-icon">&#9733;</span>
                <span>2-Year Warranty</span>
              </div>
              <div className="splus-home-feature">
                <span className="splus-home-feature-icon">&#9826;</span>
                <span>White-Glove Delivery</span>
              </div>
              <div className="splus-home-feature">
                <span className="splus-home-feature-icon">&#8635;</span>
                <span>Personal Advisor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* S-Plus New — Premium New Car Banner */}
      <section className="spn-home-banner">
        <div className="container">
          <div className="spn-home-banner-content">
            <div className="spn-home-banner-text">
              <div className="spn-badge" style={{ marginBottom: '0.5rem' }}>S-Plus New</div>
              <h2>Brand New. Zero Owners. Your Name First.</h2>
              <p>Premium unregistered, unused, and demo cars from authorized dealers. Full manufacturer warranty included.</p>
              <Link to="/splus-new" className="spn-btn-primary" style={{ display: 'inline-block' }}>Explore New Cars</Link>
            </div>
            <div className="spn-home-banner-features">
              <div className="spn-home-feature">
                <span className="spn-home-feature-icon">◇</span>
                <span>Factory Fresh</span>
              </div>
              <div className="spn-home-feature">
                <span className="spn-home-feature-icon">★</span>
                <span>Full Warranty</span>
              </div>
              <div className="spn-home-feature">
                <span className="spn-home-feature-icon">◈</span>
                <span>First Registration</span>
              </div>
              <div className="spn-home-feature">
                <span className="spn-home-feature-icon">⟐</span>
                <span>White-Glove Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Fuel Type */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Fuel Type</h2>
          </div>
          <div className="fuel-type-grid">
            {fuelTypes.map((f) => (
              <Link key={f.name} to={`/search?fuel_type=${encodeURIComponent(f.name)}`} className="fuel-type-card">
                <span className="fuel-type-icon">{f.icon}</span>
                <span className="fuel-type-name">{f.name}</span>
                <span className="fuel-type-count">{f.count} cars</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head" style={{ justifyContent: 'center' }}>
            <h2>How It Works</h2>
          </div>
          <div className="how-it-works-grid">
            {[
              { icon: '🔍', num: '1', title: 'Browse & Search', desc: 'Explore 12,000+ quality-inspected used cars with detailed specs and photos' },
              { icon: '🚗', num: '2', title: 'Book Test Drive', desc: 'Schedule a free home test drive or visit our nearest hub' },
              { icon: '💳', num: '3', title: 'Reserve Your Car', desc: 'Pay a small refundable deposit to hold the car for 48 hours' },
              { icon: '🏠', num: '4', title: 'Doorstep Delivery', desc: 'We handle RC transfer, insurance, and deliver to your doorstep' },
            ].map((step) => (
              <div key={step.num} className="how-step">
                <div className="how-step-icon">{step.icon}</div>
                <span className="how-step-num">{step.num}</span>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What Our Customers Say</h2>
            <span style={{ color: '#FFC107', fontSize: '1.1rem' }}>★★★★★ <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>4.8/5 rating</span></span>
          </div>
          <div className="reviews-grid">
            {reviews.map((r) => (
              <div key={r.name} className="review-card">
                <div className="review-stars">{'★'.repeat(r.rating)}</div>
                <p className="review-text">"{r.text}"</p>
                <div className="review-author">
                  <div className="review-avatar">{r.name[0]}</div>
                  <div>
                    <div className="review-name">{r.name}</div>
                    <div className="review-meta">{r.city} &middot; Bought {r.car}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sell Your Car CTA */}
      <section className="section">
        <div className="container">
          <div className="sell-cta-section">
            <div>
              <h2>Want to Sell Your Car?</h2>
              <p>Get the best price for your car. Enter your registration number to get started.</p>
            </div>
            <div className="sell-cta-form">
              <input className="sell-cta-input" placeholder="Enter Registration No. (e.g., DL 01 AB 1234)" />
              <button className="btn btn-primary btn-lg" type="button">Get Best Price</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
