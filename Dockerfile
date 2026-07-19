# syntax=docker/dockerfile:1
# Minimal static-site container. Repo has no application code yet; this
# placeholder image lets the deploy pipeline complete and produce a real URL.
FROM nginx:1.27-alpine

# Serve on 8080 (not 80) so no root privileges are required.
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/conf.d/default.conf.bak \
 && rm -rf /usr/share/nginx/html/* \
 && sed -i 's/listen[[:space:]]*80;/listen 8080;/' /etc/nginx/nginx.conf 2>/dev/null || true

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
