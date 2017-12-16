#functions library to create plots

#require these libraries
require(reshape2)
require(ggplot2)
require(plyr)
require(scales)
require(ggdendro)
require(RColorBrewer)
require(gplots)
require(biomaRt)


#plot heatmap of informative mark-roi
get_markroi_heatmap <- function (infile, outfile, ...){
  file <- read.table(infile,header=T)
  a <- file[,order(colSums(file))]
  b <- a[order(-rowSums(a)),]
  b$Marks <- rownames(b)
  b$Marks <- with(b,factor(Marks,levels=Marks,ordered=TRUE))
  mdf <- melt(b,id.var="Marks")
  names(mdf) <- c("Marks","ROI","Informative_Score")

  pdf("heatmapOutput.PDF", height=16, width=20)
  (p1 <- ggplot(mdf,aes(Marks,ROI)) + geom_tile(aes(fill=Informative_Score))) + 
    scale_fill_gradient(colours=c('white','lightred','darkred'),breaks=b,labels=format(b)) + 
    theme(text = element_text(size=18), 
          axis.text.x=element_text(angle=90), 
          axis.text = element_text(colour="black"), 
          legend.text=element_text(size=12),
          legend.title=element_text(size=12)) + 
    labs(x=" ", y=" ",fill="Tree Score\n")
  dev.off()

}

#get the dendogram in newick format and heatmap 
get_newick <- function(file, outfile, ...){
	mat <- as.matrix(file)
  	mat[is.na(mat)] <- 0
  	cormat <- cor(mat)
  	hr<-hclust(as.dist(1-cor(cormat)))
	hc<-hclust(as.dist(1-cor(t(cormat))))

	pdf("newick_heatmap.pdf", height=16, width=20)
	heatmap.2(cormat,
            Rowv=as.dendrogram(hr),
            Colv=as.dendrogram(hc),
            xlab="",ylab="",
            margins=c(12,12),
            key=FALSE,
            trace="none",
            density.info=c("histogram"),
            #dendrogram='none',
            col=c("#5E4FA2","#3288BD","#66C2A5","#ABDDA4","#E6F598","#FFFFBF","#FEE08B","#FDAE61","#F46D43","#D53E4F","#9E0142"),
	          scale="none",cexRow=0.3, cexCol=0.3
  	)	
	
  	dev.off()
	
	#write(hc2Newick(hr),file="rows.newick.txt")
	write(hc2Newick(hc),file=outfile)

}

#convert the ensembleids to hugo gene symbols
get_ensemble_to_hugo_conversion <- function(query_list,format,newFormat){
  #format and newFormat Options
  #"hgnc_symbol"     "hgnc_symbol"     "description"     "chromosome_name"
  #"band"            "strand"          "start_position"  "end_position"   
  #"ensembl_gene_id"
  mart <- useMart("ensembl",dataset="hsapiens_gene_ensembl")
  return_list = NULL
  for (i in query_list){
    g = getGene (id = i,type=format,mart=mart)
    return_list <- rbind(return_list, g$ensembl_gene_id)
  }

  return(return_list)
}

#make a distribution plot
get_distPlot <- function(infile, outfile, ...) {
  rnaSeq <- read.table(infile,header=TRUE)
  ensembleIds <- read.table(file = file.choose(new=TRUE),header= F,row.names=NULL)
  geneList <- read.table(file = file.choose(new=TRUE),header= F,sep="\t")


  test <- rnaSeq[rnaSeq[,1] %in% geneList[,4],]
  #H1 - E003
  group1 <- test$E003
  #NCD - E053
  #hDCM - E013
  #HDNP - E007
  #MCD34 - E050
  #CD4N - E038
  group2 <- test$E050
  #two sample kolmogrov-smirnov test
  ks.test(log2(group1),log2(group2),alternative="greater")
  #ks.test(log2(group1),log2(group2),alternative="less")

  df <- data.frame(x=c(group1,group2))
  g <- gl(2,length(group1))


  ggplot(df,aes(x,colour=g))+stat_ecdf()+xlim(0,5)+ylim(0.3,1)+theme_bw()
  #png("test2.png",width=130,height=175,pointsize=12)
  #plot(ecdf(log2(group2)), do.points = FALSE, verticals=T,xlim=c(-8,10.2),ylab=" ",xlab=" ",col="red",main=" ",cex.axis=1.6)
  #lines(ecdf(log2(group1)), lty=3, do.points = FALSE, verticals=T,col="green")

  #dev.off()

}

normalize <- function(x) { 
  x <- sweep(x, 2, apply(x, 2, min)) 
  y <- sweep(x, 2, apply(x, 2, max), "/") 
  return(y)
}


get_heatmap <- function(infile, outfile){
  file <- read.table(infile,header=T,row.names='Index')
  norm <- normalize(file)
  b <- norm[order(names(norm)),order(names(norm))]


  b$Marks <- rownames(b)
  b$Marks <- factor(b$Marks,levels=unique(b$Marks),ordered=TRUE)


  mdf <- melt(b, id.var="Marks")

  pdf(outfile, height=16, width=20)
  ggplot(mdf,aes(Marks,variable))+geom_tile(aes(fill=value))+
    scale_fill_gradient(low='white',high='purple')+
    theme(text = element_text(size=18,hjust=1,vjust=0.3), 
        axis.text.x=element_text(angle=90))+
    labs(x=" ", y=" ",fill="Shared Enhancers\n Region Score\n")
  dev.off()

}


perform.ttest <- function(matrix.a, matrix.b) {
        if(dim(matrix.a)[1]!=dim(matrix.b)[1]) {
                stop("ERROR: data matrices must have same number of features (rows)")
        }
        numfeats=dim(matrix.a)[1]
        p.vals=rep(NA, times=numfeats)
        names(p.vals)=rownames(matrix.a)
        for(feat.ind in 1:numfeats) {
                if (feat.ind%%10000==0) {
                        print(paste("Processing feature ", feat.ind, "...", sep=""))
                        #   print(sort( sapply(ls(),function(x){object.size(get(x))})));
                        #   print(gc())
                        #   print(mem())
                }
                result=try(t.test(matrix.a[feat.ind,], matrix.b[feat.ind,], alternative="two.sided", paired=FALSE, mu=0, na.action=na.omit), silent=TRUE)
                if(!is(result,"try-error") && !is.na(result$p.val)) {
                        ## append test statistic
                        p.vals[feat.ind]= result$p.val
                }
        }
        return(p.vals)
}

perform.ftest <- function(matrix.a, matrix.b) {
        if(dim(matrix.a)[1]!=dim(matrix.b)[1]) {
                stop("ERROR: data matrices must have same number of features (rows)")
        }
        numfeats=dim(matrix.a)[1]
        p.vals=rep(NA, times=numfeats)
        names(p.vals)=rownames(matrix.a)
        for(feat.ind in 1:numfeats) {
                if (feat.ind%%10000==0) {
                        print(paste("Processing feature ", feat.ind, "...", sep=""))
                }
                result=try(var.test(matrix.a[feat.ind,], matrix.b[feat.ind,], alternative="two.sided", na.action=na.omit), silent=TRUE)
                if(!is(result,"try-error") && !is.na(result$p.val)) {
                        ## append test statistic
                        p.vals[feat.ind]=result$p.value
                }
        }
        return(p.vals)
}

perform.bonferroni <- function(p.vals) {
        p.vals[which(is.na(p.vals))] = 1
        return(sort(p.vals*length(p.vals), decreasing=FALSE))
}
perform.fdr <- function(p.vals) {
        p.vals[which(is.na(p.vals))] = 1
        corrected.pvals=sort(p.adjust(p.vals, method="BH"))
        #corrected.pvals=sort(qvalue(p.vals)$qvalues, decreasing=FALSE)
        return(corrected.pvals)
}

perform.wilcoxtest <- function(matrix.a, matrix.b) {
        if(dim(matrix.a)[1]!=dim(matrix.b)[1]) {
                stop("ERROR: data matrices must have same number of features (rows)")
        }
        numfeats=dim(matrix.a)[1]
        p.vals=rep(NA, times=numfeats)
        names(p.vals)=rownames(matrix.a)
        for(feat.ind in 1:numfeats) {
                if (feat.ind%%10000==0) {
                        print(paste("Processing feature ", feat.ind, "...", sep=""))
                }
                v1=matrix.a[feat.ind,]
                v2=matrix.b[feat.ind,]
                result=try(wilcox.test(matrix.a[feat.ind,], matrix.b[feat.ind,], alternative="two.sided", paired=FALSE, mu=0, na.action=na.omit), silent=TRUE)
                if(!is(result,"try-error") && !is.na(result$p.val)) {
                        ## fill in p-values for successful tests
                        p.vals[feat.ind]=result$p.val
                }
        }
        return(p.vals)
}




