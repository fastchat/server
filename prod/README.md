# Development Push Notifications

This is where you should place your production push certificates.

## Creating the Files ##

After requesting the certificate from Apple, download the .cer file (usually named aps_production.cer or aps_development.cer) from the iOS Provisioning Portal, save in a clean directory, and import it into Keychain Access.

It should now appear in the keyring under the "Certificates" category, as `Apple {Production|Development} IOS Push Services`. Inside the certificate you should see a private key (only when filtering for the "Certificates" category). Export this private key as a .p12 file.

Now, in the directory containing cert.cer and key.p12, execute the following commands to generate your .pem files:

```
$ openssl x509 -in cert.cer -inform DER -outform PEM -out cert.pem
$ openssl pkcs12 -in key.p12 -out key.pem -nodes
```

There should be two files in this directoy:
1. `cert.pem`
2. `key.pem`
