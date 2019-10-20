# Legedatabasen
Dette er FDFs legedatabase
Udviklet af legeudvalget, som et friviligt projekt.

# Installation
For at installere frontend:

    git clone "https://github.com/Pilen/legedatabasen.git"
    cd legedatabasen/frontend
    bower install
    wget dev.legedatabasen.dk/data.json
    scp -r -P 42000 "www-data@dev.legedatabasen.dk:~/legedatabasen/frontend/images/entries/" images/entries/

# Terminologi
* Element: En lille firkant, vist i oversigten af lege, der representere én specifik leg. Når man trykker på den åbnes den tilhørende modal.
* Modal: Visningen af en leg sker i en modal, som er et 'vindue' der lægges 'oven' på siden.
* (Kategori) Swiper: Metoden til at vælge lege kategori, primært til telefoner. Man kan swipe eller klikke for at bladre igennem kategorierne, den i midten er "valgt"
* (Kategori) Selector: Metoden til at vælge lege kategori, primært til browsere. Et 'grid' af ikoner, 1 kan være valgt (eller ingen)


# Notes on javascript performance
It is fastest to create elements like
```
    var x = '';
    for (var i = 0; i < 1000; i++) {
        x += '<div>'+i+'</div>\n';
    }
    $("#testing")[0].innerHTML = x;
```
